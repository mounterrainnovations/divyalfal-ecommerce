import Link from 'next/link';
import {
  Activity,
  ImageOff,
  Images,
  Mail,
  MailOpen,
  Plus,
  ShoppingBag,
  Tag,
  Type,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { prisma } from '@/lib/db';
import ScreenHead from '@/components/admin/ScreenHead';
import Notice from '@/components/admin/Notice';
import TrendChart, { type TrendPoint } from '@/components/admin/TrendChart';
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
 * Dashboard: the state of the shop in one screen.
 *
 * It follows the shape of the admin the owner asked this portal to match — a row of figures,
 * a trend, a summary beside it, and the recent activity underneath — but every figure is a
 * `count()` on a table this portal already manages. There is no revenue line because this shop
 * does not take payments, and no orders panel because it has no orders; enquiries are the work
 * that comes in, so enquiries are what the trend plots.
 *
 * It reads the database directly rather than calling its own API over HTTP — this is a server
 * component, the queries are one round trip, and a fetch to `/api/products` from the server
 * would have to forward the session cookie to get past the middleware.
 *
 * NOTHING HERE IS INVENTED. A table that does not exist yet shows an em dash and a line saying
 * so, rather than a zero. A dashboard that reports 0 products when the database is unreachable
 * is worse than one that reports nothing.
 *
 * `force-dynamic` because every figure is live. Without it the build would prerender this
 * screen, which means querying the database at build time and then serving yesterday's counts.
 */
export const dynamic = 'force-dynamic';

const WEEKS = 12;

interface Counts {
  products: number;
  onSale: number;
  withoutPhotos: number;
}

interface RecentEnquiry {
  id: string;
  name: string;
  source: string | null;
  status: 'UNREAD' | 'READ' | 'ARCHIVED';
  createdAt: Date;
}

/**
 * Products are not optional — if that query fails the screen says so and points at the health
 * endpoint. The other tables arrived with the CMS migration, which is not applied in every
 * database this runs against, so a failure there is an expected state and not an error: each
 * reader answers null and its card says "not set up yet".
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

async function readRecentEnquiries(): Promise<RecentEnquiry[] | null> {
  try {
    return await prisma.enquiry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, source: true, status: true, createdAt: true },
    });
  } catch {
    return null;
  }
}

/**
 * Enquiries per week for the last twelve weeks, oldest first.
 *
 * Bucketed in JavaScript rather than in SQL on purpose: a shop of this size has tens of rows
 * in the window, `GROUP BY date_trunc` is dialect-specific, and doing it here keeps the week
 * boundaries in the same timezone as the labels beside them.
 */
async function readWeekly(): Promise<TrendPoint[] | null> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  // Monday of the week that is WEEKS-1 weeks back, so the last bucket is the current week.
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (WEEKS - 1) * 7);

  let rows: { createdAt: Date }[];
  try {
    rows = await prisma.enquiry.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true },
    });
  } catch {
    return null;
  }

  const buckets = Array.from({ length: WEEKS }, (_, index) => {
    const from = new Date(start);
    from.setDate(from.getDate() + index * 7);
    return { from, value: 0 };
  });

  for (const row of rows) {
    const week = Math.floor((row.createdAt.getTime() - start.getTime()) / (7 * 86_400_000));
    if (week >= 0 && week < WEEKS) buckets[week].value += 1;
  }

  const label = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
  return buckets.map(bucket => ({ label: label.format(bucket.from), value: bucket.value }));
}

/**
 * One stat tile, and it is a link: a figure nobody can act on is decoration, so every tile
 * goes to the screen that figure came from. The arrow is the only affordance it needs.
 */
function Stat({
  label,
  value,
  note,
  href,
  icon: Icon,
  tone,
}: {
  label: string;
  /** Already formatted, or an em dash when the table could not be read. */
  value: string;
  note: string;
  href: string;
  icon: LucideIcon;
  /** `attention` sets the note in the accent — the tile that wants doing something about. */
  tone?: 'attention';
}) {
  return (
    <Link
      href={href}
      className={cn(
        CARD,
        'block px-5 py-4 transition-colors',
        'hover:border-[var(--ds-line-strong)] hover:bg-[var(--ds-surface-sunk)]',
        FOCUS
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className={cn(LABEL, 'min-w-0 truncate')}>{label}</span>
        <Icon
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
          className="ml-auto shrink-0 text-[var(--ds-faint)]"
        />
      </div>
      <p className={FIGURE}>{value}</p>
      <p
        className={cn(
          'mt-2 truncate text-[12px] leading-4',
          tone === 'attention'
            ? 'font-medium text-[var(--ds-accent)]'
            : 'text-[var(--ds-faint)]'
        )}
      >
        {note}
      </p>
    </Link>
  );
}

/** A quick action: an icon, a word, and where it goes. */
function Quick({ label, href, icon: Icon }: { label: string; href: string; icon: LucideIcon }) {
  return (
    <Link href={href} className={ACTION_SOFT}>
      <Icon
        size={15}
        strokeWidth={1.75}
        aria-hidden="true"
        className="text-[var(--ds-faint)]"
      />
      {label}
    </Link>
  );
}

/** One line of the catalogue summary: a condition, and what it currently says. */
function Health({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[14px] leading-5 text-[var(--ds-muted)]">
      <span
        aria-hidden="true"
        className={cn(
          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
          ok ? 'bg-emerald-500' : 'bg-[var(--ds-accent-solid)]'
        )}
      />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

export default async function OverviewPage() {
  const [counts, enquiries, media, content, recent, weekly] = await Promise.all([
    readCounts(),
    readEnquiries(),
    readMedia(),
    readContent(),
    readRecentEnquiries(),
    readWeekly(),
  ]);

  const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
  const plotted = weekly && enquiries && enquiries.total > 0 ? weekly : null;

  return (
    <div className={SCREEN}>
      <ScreenHead
        title="Dashboard"
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

      {/* Six figures across, which is the reference admin's row exactly — and six is as many
          as fit before a tile's number stops being readable at a glance. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Stat
          label="Products"
          value={counts ? String(counts.products) : '—'}
          href="/dashboard/products"
          icon={ShoppingBag}
          note={
            !counts
              ? 'catalogue unreadable'
              : counts.products === 0
                ? 'nothing in the catalogue'
                : 'in the catalogue'
          }
        />
        <Stat
          label="On sale"
          value={counts ? String(counts.onSale) : '—'}
          href="/dashboard/products"
          icon={Tag}
          note={
            !counts
              ? 'catalogue unreadable'
              : counts.onSale === 0
                ? 'no sale prices set'
                : 'showing a sale price'
          }
        />
        <Stat
          label="Enquiries"
          value={enquiries ? String(enquiries.total) : '—'}
          href="/dashboard/enquiries"
          icon={Mail}
          note={enquiries ? 'received all time' : 'table not in this database'}
        />
        <Stat
          label="To reply"
          value={enquiries ? String(enquiries.unread) : '—'}
          href="/dashboard/enquiries"
          icon={MailOpen}
          tone={enquiries && enquiries.unread > 0 ? 'attention' : undefined}
          note={
            !enquiries
              ? 'table not in this database'
              : enquiries.unread > 0
                ? 'waiting for an answer'
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
              ? 'library not in this database'
              : media.total === 0
                ? 'the library is empty'
                : `${media.total - media.films} photos, ${media.films} films`
          }
        />
        <Stat
          label="Needs photos"
          value={counts ? String(counts.withoutPhotos) : '—'}
          href="/dashboard/products"
          icon={ImageOff}
          tone={counts && counts.withoutPhotos > 0 ? 'attention' : undefined}
          note={
            !counts
              ? 'catalogue unreadable'
              : counts.withoutPhotos > 0
                ? 'showing a placeholder'
                : 'every product has one'
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={cn(CARD, 'lg:col-span-2')}>
          <div className={CARD_HEAD}>
            <h2 className={SECTION_TITLE}>Enquiries received</h2>
            <span className={META}>Last {WEEKS} weeks, by week</span>
          </div>
          <div className={CARD_BODY}>
            {plotted ? (
              <TrendChart
                points={plotted}
                caption={`Enquiries received per week over the last ${WEEKS} weeks`}
                unit={value => (value === 1 ? 'enquiry' : 'enquiries')}
              />
            ) : (
              <p className={cn(META, 'py-10 text-center')}>
                {enquiries
                  ? 'No enquiries have come in yet, so there is no trend to plot.'
                  : 'The enquiries table is not in this database yet.'}
              </p>
            )}
          </div>
        </div>

        <div className={CARD}>
          <div className={CARD_HEAD}>
            <h2 className={SECTION_TITLE}>Catalogue summary</h2>
          </div>
          <div className={CARD_BODY}>
            {counts ? (
              <ul className="space-y-3">
                <Health ok={counts.products > 0}>
                  {counts.products === 0
                    ? 'The catalogue is empty — the shop has nothing to show.'
                    : `${counts.products} ${counts.products === 1 ? 'product is' : 'products are'} live in the shop.`}
                </Health>
                <Health ok={counts.withoutPhotos === 0}>
                  {counts.withoutPhotos === 0
                    ? 'Every product has at least one photograph.'
                    : `${counts.withoutPhotos} ${counts.withoutPhotos === 1 ? 'product is' : 'products are'} showing a placeholder image.`}
                </Health>
                <Health ok={!enquiries || enquiries.unread === 0}>
                  {!enquiries
                    ? 'Enquiries are not set up in this database.'
                    : enquiries.unread === 0
                      ? 'No enquiry is waiting for a reply.'
                      : `${enquiries.unread} ${enquiries.unread === 1 ? 'enquiry needs' : 'enquiries need'} a reply.`}
                </Health>
                <Health ok={Boolean(content && content.total > 0)}>
                  {!content
                    ? 'Page copy is not set up in this database.'
                    : `${content.total} editable blocks across ${content.pages} ${content.pages === 1 ? 'page' : 'pages'}.`}
                </Health>
              </ul>
            ) : (
              <p className={META}>The catalogue could not be read.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={CARD}>
          <div className={CARD_HEAD}>
            <h2 className={SECTION_TITLE}>Recent enquiries</h2>
            <Link
              href="/dashboard/enquiries"
              className={cn('rounded text-[13px] font-medium text-[var(--ds-accent)] hover:underline', FOCUS)}
            >
              View all
            </Link>
          </div>
          {recent && recent.length > 0 ? (
            <ul className="divide-y divide-[var(--ds-line)]">
              {recent.map(enquiry => (
                <li key={enquiry.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] leading-5 font-medium text-[var(--ds-ink)]">
                      {enquiry.name}
                    </span>
                    <span className={cn(META, 'block truncate')}>
                      {enquiry.source === 'academy' ? 'Virasat Academy' : 'Contact form'} ·{' '}
                      {day.format(enquiry.createdAt)}
                    </span>
                  </span>
                  <span className={badge(enquiry.status === 'UNREAD' ? 'accent' : 'neutral')}>
                    {enquiry.status === 'UNREAD'
                      ? 'Unread'
                      : enquiry.status === 'READ'
                        ? 'Read'
                        : 'Archived'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className={CARD_BODY}>
              <p className={META}>
                {recent
                  ? 'Nothing has come in through the contact form yet.'
                  : 'The enquiries table is not in this database yet.'}
              </p>
            </div>
          )}
        </div>

        <div className={CARD}>
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
                className="text-[var(--ds-faint)]"
              />
              Database health
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
