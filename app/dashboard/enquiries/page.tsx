'use client';

import { useEffect, useState } from 'react';
import DataTable, { type Column } from '@/components/admin/DataTable';
import ScreenHead from '@/components/admin/ScreenHead';
import Notice from '@/components/admin/Notice';
import Sheet from '@/components/admin/Sheet';
import Toast, { type ToastMessage } from '@/components/admin/Toast';
import {
  ACTION_QUIET,
  ACTION_SOFT,
  LABEL,
  META,
  SCREEN,
  TAB,
  TAB_ON,
  TABS,
  badge,
  type BadgeTone,
} from '@/components/admin/styles';
import { cn } from '@/lib/utils';
import { request, send } from '@/lib/admin/api';
import { announceEnquiriesChanged } from '@/lib/admin/events';

/**
 * Enquiries: what the contact form and the academy form wrote, newest first.
 *
 * **Read-only but for the status.** An enquiry is a visitor's own words; nothing here edits
 * them, and there is no reply box, because no mail is sent from this portal and a reply field
 * that quietly goes nowhere would be the cruellest control in the building. The actions are
 * the three a worklist needs: read, unread, archived.
 *
 * **Unread is emphasised twice.** The name is set in ink where a read enquiry's is soft, and
 * the row carries the word "Unread" — never colour or weight alone. The same count sits beside
 * the rail item, so the portal says how much is waiting from any screen.
 *
 * **`source` is now a column on the row**, not a tag inside the message: see
 * `lib/repositories/enquiries.ts`. The message shown here is exactly what the visitor typed.
 */

type Status = 'UNREAD' | 'READ' | 'ARCHIVED';

interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  source: 'contact' | 'academy' | null;
  status: Status;
  createdAt: string;
}

const FILTERS = [
  { value: '', label: 'Everything' },
  { value: 'UNREAD', label: 'Unread' },
  { value: 'READ', label: 'Read' },
  { value: 'ARCHIVED', label: 'Archived' },
] as const;

const SOURCE_LABEL: Record<string, string> = {
  contact: 'Contact form',
  academy: 'Academy form',
};

const STATUS_LABEL: Record<Status, string> = {
  UNREAD: 'Unread',
  READ: 'Read',
  ARCHIVED: 'Archived',
};

/**
 * The badge each state wears. Unread is the accent — it is the only one that means "do
 * something" — read is plain, and archived is quieter still. The word is in the badge either
 * way, so the tone is reinforcement and never the information itself.
 */
const STATUS_TONE: Record<Status, BadgeTone> = {
  UNREAD: 'accent',
  READ: 'neutral',
  ARCHIVED: 'neutral',
};

/** 17 Nov, 21:40 — a worklist needs the day and the time, not the year. */
function when(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, ${date.toLocaleTimeString(
    'en-IN',
    { hour: '2-digit', minute: '2-digit', hour12: false }
  )}`;
}

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState<'' | Status>('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notSetUp, setNotSetUp] = useState(false);
  const [failure, setFailure] = useState('');
  const [open, setOpen] = useState<Enquiry | null>(null);
  const [working, setWorking] = useState<string>('');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // The cursor belongs to the filter it was issued under; a changed filter reads from the top.
  const [page, setPage] = useState<{ key: string; cursor: string | null }>({ key: '', cursor: null });
  const effectiveCursor = page.key === filter ? page.cursor : null;

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      if (effectiveCursor) params.set('cursor', effectiveCursor);

      const answer = await request<{
        enquiries: Enquiry[];
        nextCursor: string | null;
        unread: number;
      }>(`/api/admin/enquiries?${params}`, { signal: controller.signal });
      if (answer.aborted) return;

      if (answer.ok && answer.data) {
        const rows = answer.data.enquiries;
        setEnquiries(current =>
          effectiveCursor
            ? [...current, ...rows.filter(fresh => !current.some(had => had.id === fresh.id))]
            : rows
        );
        setNextCursor(answer.data.nextCursor);
        setUnread(answer.data.unread);
        announceEnquiriesChanged(answer.data.unread);
        setFailure('');
        setNotSetUp(false);
      } else {
        setNextCursor(null);
        setNotSetUp(answer.notSetUp);
        setFailure(answer.notSetUp ? '' : answer.message);
      }
      setLoading(false);
    };

    load();
    return () => controller.abort();
  }, [filter, effectiveCursor]);

  async function setStatus(enquiry: Enquiry, status: Status) {
    setWorking(enquiry.id);
    const answer = await send<Enquiry>(`/api/admin/enquiries/${enquiry.id}`, 'PATCH', { status });
    setWorking('');

    if (!answer.ok || !answer.data) {
      setToast({ text: answer.message, tone: 'error' });
      return;
    }

    const updated = answer.data;
    setEnquiries(current =>
      // A row that no longer matches the filter leaves the list rather than sitting there
      // contradicting the filter above it.
      filter && updated.status !== filter
        ? current.filter(had => had.id !== updated.id)
        : current.map(had => (had.id === updated.id ? updated : had))
    );
    setOpen(current => (current?.id === updated.id ? updated : current));

    const delta =
      (enquiry.status === 'UNREAD' ? -1 : 0) + (updated.status === 'UNREAD' ? 1 : 0);
    const nowUnread = Math.max(0, unread + delta);
    setUnread(nowUnread);
    announceEnquiriesChanged(nowUnread);

    setToast({
      text:
        updated.status === 'ARCHIVED'
          ? `${updated.name}’s enquiry was archived.`
          : `${updated.name}’s enquiry is marked ${STATUS_LABEL[updated.status].toLowerCase()}.`,
      tone: 'ok',
    });
  }

  const columns: Column<Enquiry>[] = [
    {
      // Hidden on a phone, where the six columns cannot all fit and the two that matter are
      // the name and what state it is in. The date moves under the name instead of being
      // scrolled off the right edge with the actions.
      key: 'when',
      head: 'Received',
      className: 'hidden w-[104px] tabular-nums sm:table-cell',
      cell: enquiry => <span className="text-slate-500">{when(enquiry.createdAt)}</span>,
    },
    {
      key: 'name',
      head: 'Name',
      wrap: true,
      className: 'min-w-[100px]',
      cell: enquiry => (
        <button
          type="button"
          onClick={() => {
            setOpen(enquiry);
            if (enquiry.status === 'UNREAD') void setStatus(enquiry, 'READ');
          }}
          className={cn(
            'block max-w-full truncate py-1 text-left hover:underline',
            // Unread is heavier as well as badged: in a long worklist the weight is what the
            // eye picks up before it reads anything.
            enquiry.status === 'UNREAD' ? 'font-semibold text-ink' : 'text-slate-600'
          )}
        >
          {enquiry.name}
          <span className={cn(META, 'block sm:hidden')}>{when(enquiry.createdAt)}</span>
        </button>
      ),
    },
    {
      key: 'contact',
      head: 'Reply to',
      className: 'hidden sm:table-cell max-w-[200px] truncate',
      cell: enquiry => (
        <span className="text-slate-500">{enquiry.email || enquiry.phone || '—'}</span>
      ),
    },
    {
      key: 'source',
      head: 'From',
      className: 'hidden md:table-cell',
      cell: enquiry => (
        <span className="text-slate-500">
          {enquiry.source ? SOURCE_LABEL[enquiry.source] : 'Not recorded'}
        </span>
      ),
    },
    {
      key: 'status',
      head: 'State',
      className: 'w-[96px]',
      cell: enquiry => (
        <span className={badge(STATUS_TONE[enquiry.status])}>{STATUS_LABEL[enquiry.status]}</span>
      ),
    },
    {
      key: 'actions',
      head: '',
      className: 'w-[180px] text-right',
      cell: enquiry => (
        <span className="inline-flex items-center justify-end gap-1">
          <button
            type="button"
            disabled={working === enquiry.id}
            onClick={() => setStatus(enquiry, enquiry.status === 'UNREAD' ? 'READ' : 'UNREAD')}
            className={ACTION_QUIET}
          >
            {enquiry.status === 'UNREAD' ? 'Mark read' : 'Mark unread'}
          </button>
          {enquiry.status === 'ARCHIVED' ? (
            <button
              type="button"
              disabled={working === enquiry.id}
              onClick={() => setStatus(enquiry, 'READ')}
              className={ACTION_QUIET}
            >
              Unarchive
            </button>
          ) : (
            <button
              type="button"
              disabled={working === enquiry.id}
              onClick={() => setStatus(enquiry, 'ARCHIVED')}
              className={ACTION_QUIET}
            >
              Archive
            </button>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className={SCREEN}>
      <ScreenHead
        title="Enquiries"
        note={
          notSetUp
            ? undefined
            : unread > 0
              ? `${unread} unread. Nothing is sent from here — reply by email or WhatsApp.`
              : 'Nothing unread. Nothing is sent from here — reply by email or WhatsApp.'
        }
      />

      {notSetUp ? (
        <Notice label="Not set up yet">
          The enquiries table is not in this database yet, so nothing can be listed. The public
          forms still hand over to WhatsApp as they always have; the copy they also save for this
          screen begins once the migration has been applied.
        </Notice>
      ) : failure ? (
        <Notice label="Problem" tone="problem">
          {failure}
        </Notice>
      ) : (
        <>
          {/* The worklist's filter, as tabs rather than a select: four states, and which one
              you are in should be readable without opening anything. */}
          <nav aria-label="Filter by state" className="mb-4">
            <ul className={TABS}>
              {FILTERS.map(option => (
                <li key={option.value}>
                  <button
                    type="button"
                    aria-current={option.value === filter ? 'true' : undefined}
                    onClick={() => {
                      setFilter(option.value as '' | Status);
                      setPage({ key: option.value, cursor: null });
                    }}
                    className={cn(TAB, option.value === filter && TAB_ON)}
                  >
                    {option.label}
                    {option.value === 'UNREAD' && unread > 0 ? (
                      <span className={badge('accent')}>{unread}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <DataTable
            columns={columns}
            rows={enquiries}
            rowKey={enquiry => enquiry.id}
            busy={loading}
            caption="Enquiries, newest first, with who sent them and which form they came from"
            empty={
              loading
                ? 'Reading the enquiries…'
                : filter
                  ? `Nothing is ${STATUS_LABEL[filter as Status].toLowerCase()}.`
                  : 'No enquiries yet. The contact and academy forms save a copy of every one here.'
            }
          />

          {nextCursor ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => setPage({ key: filter, cursor: nextCursor })}
              className={cn(ACTION_SOFT, 'mt-4')}
            >
              {loading ? 'Loading' : 'Show older'}
            </button>
          ) : null}
        </>
      )}

      {open ? (
        <Sheet
          open
          onClose={() => setOpen(null)}
          eyebrow={open.source ? SOURCE_LABEL[open.source] : 'Enquiry'}
          title={open.name}
          footer={
            <>
              <button
                type="button"
                disabled={working === open.id}
                onClick={() => setStatus(open, open.status === 'UNREAD' ? 'READ' : 'UNREAD')}
                className={ACTION_SOFT}
              >
                {open.status === 'UNREAD' ? 'Mark read' : 'Mark unread'}
              </button>
              {open.status !== 'ARCHIVED' ? (
                <button
                  type="button"
                  disabled={working === open.id}
                  onClick={() => setStatus(open, 'ARCHIVED')}
                  className={ACTION_SOFT}
                >
                  Archive
                </button>
              ) : null}
            </>
          }
        >
          <dl className="space-y-3 text-[13px] text-ink">
            <Line label="Received">{when(open.createdAt)}</Line>
            <Line label="State">
              <span className={badge(STATUS_TONE[open.status])}>
                {STATUS_LABEL[open.status]}
              </span>
            </Line>
            <Line label="Email">
              {open.email ? (
                <a href={`mailto:${open.email}`} className="underline decoration-slate-300">
                  {open.email}
                </a>
              ) : (
                <span className="text-slate-500">None given</span>
              )}
            </Line>
            <Line label="Phone">
              {open.phone ? (
                <a href={`tel:${open.phone}`} className="underline decoration-slate-300">
                  {open.phone}
                </a>
              ) : (
                <span className="text-slate-500">None given</span>
              )}
            </Line>
            <Line label="From">
              {open.source ? SOURCE_LABEL[open.source] : 'Not recorded'}
            </Line>
          </dl>

          <div className="mt-5 border-t border-slate-200 pt-4">
            <p className={cn(LABEL, 'mb-2')}>What they wrote</p>
            {/* Plain text, preserved as typed. Never rendered as markup. */}
            <p className="max-w-[68ch] whitespace-pre-wrap text-[13px] text-ink">
              {open.message}
            </p>
          </div>
        </Sheet>
      ) : null}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className={cn(LABEL, 'w-[72px] shrink-0 pt-0.5')}>{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-slate-700">{children}</dd>
    </div>
  );
}
