import Link from 'next/link';
import {
  Activity,
  ArrowUpRight,
  Images,
  Mail,
  Plus,
  ShoppingBag,
  Type,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { prisma } from '@/lib/db';
import ScreenHead from '@/components/admin/ScreenHead';
import Notice from '@/components/admin/Notice';
import {
  ACTION_SOFT,
  CARD,
  CARD_BODY,
  CARD_HEAD,
  FIGURE,
  FOCUS,
  LABEL,
  META,
  SCREEN,
  SECTION_TITLE,
  badge,
} from '@/components/admin/styles';
import { cn } from '@/lib/utils';

/**
 * Overview: the state of the shop in one screen, no charts.
 *
 * Two products and a handful of photographs do not need a reporting suite; they need four
 * figures, the one thing that is wrong, and a short way to the work. So: four stat cards, an
 * attention card that only exists when there is something to attend to, and the half-dozen
 * actions an admin starts a session with.
 *
 * It reads the database directly rather than calling its own API over HTTP — this is a server
 * component, the queries are one round trip, and a fetch to `/api/products` from the server
 * would have to forward the session cookie to get past the middleware.
 *
 * NOTHING HERE IS INVENTED. Every figure is a `count()` on a table the portal already manages,
 * and a table that does not exist yet shows an em dash with a line saying so, rather than a
 * zero. A dashboard that reports 0 products when the database is unreachable is worse than one
 * that reports nothing.
 *
 * `force-dynamic` because every figure is live. Without it the build would prerender this
 * screen, which means querying the database at build time and then serving yesterday's counts.
 */
export const dynamic = 'force-dynamic';

interface Counts {
  products: number;
  onSale: number;
  withoutPhotos: number;
}

/**
 * Products are not optional — if that query fails the screen says so and points at the health
 * endpoint. The other three tables arrived with the CMS migration, which is not applied in
 * every database this runs against, so a failure there is an expected state and not an error:
 * each reader answers null and its card says "not set up yet".
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

async function readMedia(): Promise<{ total: number; films: number } | null> {
  try {
    const [total, films] = await Promise.all([
      prisma.mediaAsset.count(),
      prisma.mediaAsset.count({ where: { kind: 'VIDEO' } }),
    ]);
    return { total, films };
  } catch {
    return null;
  }
}

async function readContent(): Promise<{ total: number; pages: number } | null> {
  try {
    const [total, pages] = await Promise.all([
      prisma.contentBlock.count(),
      prisma.contentBlock.findMany({ distinct: ['page'], select: { page: true } }),
    ]);
    return { total, pages: pages.length };
  } catch {
    return null;
  }
}

/**
 * One stat card, and it is a link: a figure nobody can act on is decoration, so every card
 * goes to the screen that figure came from. The arrow is the only affordance it needs.
 */
function Stat({
  label,
  value,
  note,
  href,
  icon: Icon,
  mark,
}: {
  label: string;
  /** Already formatted, or an em dash when the table could not be read. */
  value: string;
  note: string;
  href: string;
  icon: LucideIcon;
  /** A badge beside the figure — unread enquiries, and nothing else so far. */
  mark?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        CARD,
        CARD_BODY,
        'group block transition-colors hover:border-slate-300 hover:bg-slate-50/60',
        FOCUS
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <Icon size={15} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-slate-400" />
        <span className={cn(LABEL, 'min-w-0 truncate')}>{label}</span>
        <ArrowUpRight
          size={14}
          strokeWidth={1.75}
          aria-hidden="true"
          className="ml-auto shrink-0 text-slate-300 transition-colors group-hover:text-ink"
        />
      </div>
      <p className="flex items-baseline gap-2">
        <span className={FIGURE}>{value}</span>
        {mark ? <span className={badge('accent')}>{mark}</span> : null}
      </p>
      <p className={cn(META, 'mt-2')}>{note}</p>
    </Link>
  );
}

/** A quick action: an icon, a word, and where it goes. */
function Quick({ label, href, icon: Icon }: { label: string; href: string; icon: LucideIcon }) {
  return (
    <Link href={href} className={ACTION_SOFT}>
      <Icon size={15} strokeWidth={1.75} aria-hidden="true" className="text-slate-400" />
      {label}
    </Link>
  );
}

export default async function OverviewPage() {
  const [counts, enquiries, media, content] = await Promise.all([
    readCounts(),
    readEnquiries(),
    readMedia(),
    readContent(),
  ]);

  return (
    <div className={SCREEN}>
      <ScreenHead
        title="Overview"
        note={
          counts
            ? 'Everything the shop is showing right now.'
            : 'The product database did not answer, so the figures below are unavailable.'
        }
      />

      {counts ? null : (
        <Notice label="The database did not answer" tone="problem" className="mb-5">
          The catalogue could not be counted. Open{' '}
          <a href="/api/health" target="_blank" rel="noopener noreferrer" className="underline">
            the health endpoint
          </a>{' '}
          to see what the connection is doing.
        </Notice>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Products"
          value={counts ? String(counts.products) : '—'}
          href="/dashboard/products"
          icon={ShoppingBag}
          note={
            !counts
              ? 'the catalogue could not be read'
              : counts.products === 0
                ? 'nothing in the catalogue yet'
                : `${counts.onSale} on sale`
          }
        />
        <Stat
          label="Enquiries"
          value={enquiries ? String(enquiries.total) : '—'}
          href="/dashboard/enquiries"
          icon={Mail}
          mark={enquiries && enquiries.unread > 0 ? `${enquiries.unread} unread` : undefined}
          note={
            !enquiries
              ? 'the enquiries table is not in this database yet'
              : enquiries.unread > 0
                ? 'reply by email or WhatsApp'
                : 'nothing unread'
          }
        />
        <Stat
          label="Media files"
          value={media ? String(media.total) : '—'}
          href="/dashboard/media"
          icon={Images}
          note={
            !media
              ? 'the media library is not in this database yet'
              : media.total === 0
                ? 'the library is empty'
                : `${media.total - media.films} photographs, ${media.films} films`
          }
        />
        <Stat
          label="Content blocks"
          value={content ? String(content.total) : '—'}
          href="/dashboard/content"
          icon={Type}
          note={
            !content
              ? 'the content tables are not in this database yet'
              : content.total === 0
                ? 'nothing seeded yet'
                : `across ${content.pages} public ${content.pages === 1 ? 'page' : 'pages'}`
          }
        />
      </div>

      {/* Only ever rendered when there is something to do about it. An empty "all clear" panel
          is a panel an admin learns to stop reading. */}
      {counts && counts.withoutPhotos > 0 ? (
        <Notice label="Needs attention" tone="problem" className="mt-4">
          {counts.withoutPhotos === 1
            ? 'One product has no photographs and is showing a placeholder image in the shop. '
            : `${counts.withoutPhotos} products have no photographs and are showing a placeholder image in the shop. `}
          <Link href="/dashboard/products" className="font-medium text-ink underline">
            Open Products
          </Link>
        </Notice>
      ) : null}

      <div className={cn(CARD, 'mt-4')}>
        <div className={CARD_HEAD}>
          <h2 className={SECTION_TITLE}>Quick actions</h2>
        </div>
        <div className={cn(CARD_BODY, 'flex flex-wrap gap-2')}>
          <Quick label="Add a product" href="/dashboard/products" icon={Plus} />
          <Quick label="Upload media" href="/dashboard/media" icon={Upload} />
          <Quick label="Edit page copy" href="/dashboard/content" icon={Type} />
          <Quick label="Read enquiries" href="/dashboard/enquiries" icon={Mail} />
          {/* Not a styled screen on purpose: the raw health payload is the diagnostic. */}
          <a href="/api/health" target="_blank" rel="noopener noreferrer" className={ACTION_SOFT}>
            <Activity
              size={15}
              strokeWidth={1.75}
              aria-hidden="true"
              className="text-slate-400"
            />
            Database health
          </a>
        </div>
      </div>
    </div>
  );
}
