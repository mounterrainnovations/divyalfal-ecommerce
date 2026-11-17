import Link from 'next/link';
import { prisma } from '@/lib/db';
import ScreenHead from '@/components/admin/ScreenHead';
import { ACTION, FIGURE, LABEL, RULE } from '@/components/admin/styles';
import { cn } from '@/lib/utils';

/**
 * Overview: the state of the shop in one screen, no charts. Two products and a handful of
 * photographs do not need a dashboard; they need four figures and the one thing that is
 * wrong.
 *
 * It reads the database directly rather than calling its own API over HTTP — this is a
 * server component, the query is one round trip, and a fetch to `/api/products` from the
 * server would have to forward the session cookie to get past the middleware.
 *
 * `force-dynamic` because every figure is live. Without it the build would prerender this
 * screen, which means querying the database at build time and then serving yesterday's
 * counts.
 */
export const dynamic = 'force-dynamic';

interface Counts {
  products: number;
  onSale: number;
  withoutPhotos: number;
}

/**
 * Enquiries arrive with Task 8. The table may not exist yet in whatever database this is
 * pointed at, so a failure here is expected rather than exceptional: the screen simply does
 * not show the figure. Products are not optional — if that query fails the screen says so
 * and points at the health endpoint.
 */
async function readCounts(): Promise<Counts | null> {
  try {
    const [products, onSale, withoutPhotos] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { sale: true } }),
      prisma.product.count({ where: { photos: { isEmpty: true } } }),
    ]);
    return { products, onSale, withoutPhotos };
  } catch (error) {
    console.error('[dashboard] product counts unavailable:', error);
    return null;
  }
}

async function readEnquiries(): Promise<{ total: number; unread: number } | null> {
  try {
    const [total, unread] = await Promise.all([
      prisma.enquiry.count(),
      prisma.enquiry.count({ where: { status: 'UNREAD' } }),
    ]);
    return { total, unread };
  } catch {
    return null;
  }
}

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className={cn('border-t pt-3', RULE)}>
      <p className={cn(LABEL, 'mb-2')}>{label}</p>
      <p className={FIGURE}>{value}</p>
      {note ? <p className="mt-1.5 font-ui text-eyebrow text-ink-soft">{note}</p> : null}
    </div>
  );
}

export default async function OverviewPage() {
  const [counts, enquiries] = await Promise.all([readCounts(), readEnquiries()]);

  return (
    <div className="max-w-[1120px] px-[var(--gutter)] py-6">
      <ScreenHead
        eyebrow="Portal"
        title="Overview"
        note={
          counts
            ? 'Everything the shop is showing right now.'
            : 'The product database did not answer. The figures below are unavailable.'
        }
      />

      {counts ? (
        <>
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-4">
            <Figure label="Products" value={String(counts.products)} />
            <Figure
              label="On sale"
              value={String(counts.onSale)}
              note={
                counts.products > 0
                  ? `of ${counts.products} in the catalogue`
                  : 'nothing in the catalogue'
              }
            />
            <Figure
              label="No photographs"
              value={String(counts.withoutPhotos)}
              note={
                counts.withoutPhotos > 0
                  ? 'these show a placeholder in the shop'
                  : 'every product has at least one'
              }
            />
            <Figure
              label="Enquiries"
              value={enquiries ? String(enquiries.total) : '—'}
              note={
                enquiries
                  ? `${enquiries.unread} unread`
                  : 'the enquiries table is not reachable yet'
              }
            />
          </div>

          {counts.withoutPhotos > 0 ? (
            <div className={cn('mt-8 border-t pt-4', RULE)}>
              <p className={cn(LABEL, 'mb-2')}>Needs attention</p>
              <p className="font-ui text-caption text-ink">
                {counts.withoutPhotos === 1
                  ? 'One product has no photographs and is showing a placeholder image in the shop.'
                  : `${counts.withoutPhotos} products have no photographs and are showing a placeholder image in the shop.`}{' '}
                <Link href="/dashboard/products" className="underline decoration-gold">
                  Open Products
                </Link>
              </p>
            </div>
          ) : null}
        </>
      ) : null}

      <div className={cn('mt-10 flex flex-wrap items-center gap-8 border-t pt-4', RULE)}>
        <Link href="/dashboard/products" className={ACTION}>
          Manage products
        </Link>
        {/* Not a styled screen on purpose: the raw health payload is the diagnostic. */}
        <a href="/api/health" className={ACTION} target="_blank" rel="noopener noreferrer">
          Database health
        </a>
      </div>
    </div>
  );
}
