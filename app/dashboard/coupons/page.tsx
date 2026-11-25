'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import DataTable, { type Column } from '@/components/admin/DataTable';
import ScreenHead from '@/components/admin/ScreenHead';
import Notice from '@/components/admin/Notice';
import Sheet from '@/components/admin/Sheet';
import Toast, { type ToastMessage } from '@/components/admin/Toast';
import Field, { CheckboxField, SelectInput, TextInput } from '@/components/admin/Field';
import {
  ACTION,
  ACTION_DANGER,
  ACTION_GRAVE,
  ACTION_QUIET,
  ACTION_SOFT,
  INPUT,
  LABEL,
  META,
  SCREEN,
  badge,
  type BadgeTone,
} from '@/components/admin/styles';
import { cn } from '@/lib/utils';
import { request, send } from '@/lib/admin/api';
import {
  couponStatus,
  describeCoupon,
  formatCouponDate,
  normalizeCouponCode,
  type Coupon,
  type CouponKind,
  type CouponStatus,
} from '@/lib/content/coupons';

/**
 * Coupons: the discount codes the shop publishes.
 *
 * **The status column is computed, never stored.** A coupon the owner switched on in October
 * with an end date in November is `active: true` for ever, and a table that printed that flag
 * would still be calling it "Active" in January. The word in the pill comes from
 * `couponStatus`, which reads the flag, the window and the use count against the clock — so an
 * expired coupon reads "Expired" even while its own switch is on. The sheet's checkbox edits
 * the switch; the column reports the consequence.
 *
 * **The use count is reported, not claimed.** Nothing in this shop increments it. There is no
 * checkout that takes a code — no cart, no `/checkout` route — and the `Order` table has no
 * coupon column, so no sale can record one either. The count is a number stored beside the
 * code, it moves when a sale records the code, and until something does that a usage limit is
 * the shop's stated intent rather than a limit a till enforces. The notice at the top says
 * exactly that, and the field is read-only here: an editable counter on a screen where nothing
 * counts is an invitation to type a number that means nothing.
 *
 * **Saving is wholesale and immediate.** Each add, edit and delete sends the list the owner is
 * looking at and takes back what the server actually stored — the server re-parses, so a code
 * is upper-cased and a coupon with an unreadable discount comes back switched off, and the
 * screen shows that rather than its own optimistic copy. There is no dirty buffer: a discount
 * code is a one-row decision, and holding it unsaved is a way to lose it.
 */

interface Loaded {
  coupons: Coupon[];
}

/** The pill each computed status wears. The word is always in it, so colour is never the fact. */
const STATUS: Record<CouponStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: 'Active', tone: 'success' },
  SCHEDULED: { label: 'Scheduled', tone: 'info' },
  EXPIRED: { label: 'Expired', tone: 'neutral' },
  USED_UP: { label: 'Fully used', tone: 'warn' },
  OFF: { label: 'Off', tone: 'neutral' },
};

/**
 * The form's own shape: every number is a string while it is being typed.
 *
 * A blank field has to stay blank — an empty threshold is "no threshold", and coercing it to 0
 * on each keystroke would make the box un-clearable and would store a zero that means
 * something else. `usedCount` rides along unedited so an edit cannot reset a count a sale
 * recorded.
 */
interface Draft {
  id: string;
  code: string;
  kind: CouponKind;
  value: string;
  minSubtotal: string;
  startsAt: string;
  endsAt: string;
  maxUses: string;
  usedCount: number;
  active: boolean;
  note: string;
  /** False for a coupon being added, which is also what decides whether Delete is offered. */
  existing: boolean;
}

function draftOf(coupon: Coupon): Draft {
  return {
    id: coupon.id,
    code: coupon.code,
    kind: coupon.kind,
    value: String(coupon.value),
    minSubtotal: coupon.minSubtotal === undefined ? '' : String(coupon.minSubtotal),
    startsAt: coupon.startsAt ?? '',
    endsAt: coupon.endsAt ?? '',
    maxUses: coupon.maxUses === undefined ? '' : String(coupon.maxUses),
    usedCount: coupon.usedCount,
    active: coupon.active,
    note: coupon.note,
    existing: true,
  };
}

function blankDraft(): Draft {
  return {
    // Only used as the list key and the stored id; the server keeps whatever it is given.
    id: `c-${Date.now().toString(36)}`,
    code: '',
    kind: 'PERCENT',
    value: '',
    minSubtotal: '',
    startsAt: '',
    endsAt: '',
    maxUses: '',
    usedCount: 0,
    active: false,
    note: '',
    existing: false,
  };
}

/** A field left blank stays absent; anything else goes through as a number for the parser. */
function optional(text: string): number | undefined {
  const value = text.trim();
  return value === '' ? undefined : Number(value);
}

function toCoupon(draft: Draft): Coupon {
  return {
    id: draft.id,
    code: normalizeCouponCode(draft.code),
    kind: draft.kind,
    value: Number(draft.value.trim()),
    minSubtotal: optional(draft.minSubtotal),
    startsAt: draft.startsAt.trim() || undefined,
    endsAt: draft.endsAt.trim() || undefined,
    maxUses: optional(draft.maxUses),
    usedCount: draft.usedCount,
    active: draft.active,
    note: draft.note.trim(),
  };
}

const NUMBER = /^\d+(\.\d{1,2})?$/;

/**
 * What is wrong with this draft, by field.
 *
 * Checked here rather than left to the parser because the parser's job is to never return
 * something half-broken, and the way it does that is to coerce: a percentage of 150 becomes
 * 100, a threshold of "lots" disappears. Both are the right answer for a row already in the
 * column and the wrong answer for a form, where the owner should be told what they typed
 * instead of watching it change.
 */
function problemsWith(draft: Draft, others: Coupon[]): Record<string, string> {
  const found: Record<string, string> = {};
  const code = normalizeCouponCode(draft.code);

  if (!code) found.code = 'A coupon needs a code for the customer to type.';
  else if (others.some(other => other.code === code)) {
    found.code = `${code} is already a coupon. Edit that one, or use another code.`;
  }

  const value = draft.value.trim();
  if (!value) {
    found.value = 'Say how much comes off.';
  } else if (!NUMBER.test(value)) {
    found.value = 'A number, with up to two decimal places.';
  } else if (Number(value) <= 0) {
    found.value = 'Zero takes nothing off. Use a number above zero.';
  } else if (draft.kind === 'PERCENT' && Number(value) > 100) {
    found.value = '100% is the whole order. A percentage cannot be higher than that.';
  }

  const min = draft.minSubtotal.trim();
  if (min && (!NUMBER.test(min) || Number(min) <= 0)) {
    found.minSubtotal = 'A rupee amount above zero, or leave it blank for any order.';
  }

  const uses = draft.maxUses.trim();
  if (uses && (!/^\d+$/.test(uses) || Number(uses) < 1)) {
    found.maxUses = 'A whole number of uses, at least one — or blank for no limit.';
  }

  // Both bounds come from date inputs, so they are either blank or a real calendar day; the
  // only thing left to get wrong is their order.
  if (draft.startsAt && draft.endsAt && draft.endsAt < draft.startsAt) {
    found.endsAt = 'The last day cannot come before the first.';
  }

  return found;
}

export default function CouponsPage() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [notSetUp, setNotSetUp] = useState(false);
  const [failure, setFailure] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      const answer = await request<Loaded>('/api/admin/coupons', { signal: controller.signal });
      if (answer.aborted) return;
      if (answer.notSetUp) setNotSetUp(true);
      else if (!answer.ok) setFailure(answer.message);
      else if (answer.data) setItems(answer.data.coupons);
      setLoading(false);
    })();

    return () => controller.abort();
  }, []);

  /**
   * The clock the status column is read against.
   *
   * Computed during render rather than held in state: the rows only exist after the fetch has
   * landed, so there is no server-rendered status for it to disagree with, and every save or
   * sheet interaction re-renders the table with a fresh reading.
   */
  const now = new Date();

  async function persist(next: Coupon[], done: string) {
    setSaving(true);
    const answer = await send<Loaded>('/api/admin/coupons', 'PUT', { coupons: next });
    setSaving(false);

    if (!answer.ok) {
      setToast({ tone: 'error', text: answer.message });
      return false;
    }

    // What the server stored, not what was sent: it re-parses, so an upper-cased code and a
    // coupon it refused to leave switched on are visible here immediately.
    setItems(answer.data?.coupons ?? next);
    setToast({ tone: 'ok', text: done });
    return true;
  }

  async function saveDraft() {
    if (!draft) return;

    const others = items.filter(item => item.id !== draft.id);
    const found = problemsWith(draft, others);
    setProblems(found);
    if (Object.keys(found).length > 0) {
      setToast({ tone: 'error', text: 'Nothing was saved: check the fields marked below.' });
      return;
    }

    const coupon = toCoupon(draft);
    const next = draft.existing
      ? items.map(item => (item.id === draft.id ? coupon : item))
      : [...items, coupon];

    const ok = await persist(
      next,
      draft.existing ? `${coupon.code} was saved.` : `${coupon.code} was added.`
    );
    if (ok) {
      setDraft(null);
      setProblems({});
    }
  }

  async function deleteDraft() {
    if (!draft) return;
    const ok = await persist(
      items.filter(item => item.id !== draft.id),
      `${draft.code} was deleted.`
    );
    if (ok) {
      setDraft(null);
      setConfirmDelete(false);
    }
  }

  function edit(coupon: Coupon) {
    setDraft(draftOf(coupon));
    setProblems({});
    setConfirmDelete(false);
  }

  function add() {
    setDraft(blankDraft());
    setProblems({});
    setConfirmDelete(false);
  }

  const columns: Column<Coupon>[] = [
    {
      key: 'code',
      head: 'Code',
      cell: coupon => (
        <div className="min-w-0">
          <span className="font-medium tracking-[0.04em] text-[var(--ds-ink)]">
            {coupon.code}
          </span>
          {coupon.note ? <p className={cn(META, 'truncate')}>{coupon.note}</p> : null}
        </div>
      ),
    },
    {
      key: 'what',
      head: 'What it takes off',
      wrap: true,
      cell: coupon => describeCoupon(coupon),
    },
    {
      key: 'window',
      head: 'Window',
      cell: coupon => {
        const from = formatCouponDate(coupon.startsAt);
        const until = formatCouponDate(coupon.endsAt);
        if (from && until) return `${from} to ${until}`;
        if (until) return `Until ${until}`;
        if (from) return `From ${from}`;
        // Neither bound: it runs for as long as it is switched on, which is worth saying in
        // words rather than leaving the cell blank for a reader to interpret.
        return <span className="text-[var(--ds-faint)]">No dates set</span>;
      },
    },
    {
      key: 'uses',
      head: 'Uses',
      className: 'w-[130px]',
      cell: coupon => (
        <span>
          <span className="tabular-nums">{coupon.usedCount}</span>
          <span className={cn(META, 'ml-1')}>
            {coupon.maxUses === undefined ? '· no limit' : `of ${coupon.maxUses}`}
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      head: 'Status',
      className: 'w-[120px]',
      cell: coupon => {
        const { label, tone } = STATUS[couponStatus(coupon, now)];
        return <span className={badge(tone)}>{label}</span>;
      },
    },
    {
      key: 'edit',
      head: '',
      className: 'w-[1%] text-right',
      cell: coupon => (
        <button
          type="button"
          onClick={() => edit(coupon)}
          className={ACTION_QUIET}
          aria-label={`Edit ${coupon.code}`}
        >
          Edit
        </button>
      ),
    },
  ];

  const invalid = (key: string) => Boolean(problems[key]);

  return (
    <div className={SCREEN}>
      <ScreenHead
        title="Coupons"
        note="The discount codes the shop publishes, and what each one takes off."
        actions={
          <button
            type="button"
            onClick={add}
            className={ACTION}
            disabled={notSetUp || loading || saving}
          >
            <Plus size={15} strokeWidth={1.75} aria-hidden="true" />
            Add coupon
          </button>
        }
      />

      {notSetUp ? (
        <Notice label="Not set up yet">
          The settings table is not in this database yet, so coupons cannot be stored. Nothing is
          lost by waiting — no code is published until it is saved here and switched on.
        </Notice>
      ) : failure ? (
        <Notice label="Problem" tone="problem">
          {failure}
        </Notice>
      ) : (
        <>
          <Notice label="Nothing counts a use yet" className="mb-4">
            A code saved here is one the shop honours when it takes the order — there is no
            checkout on the site that applies a code by itself, and an order carries no record of
            one. So the use count beside each code only moves when a sale records that code, and
            a usage limit is the shop’s own intent rather than something the till enforces.
          </Notice>

          <DataTable
            columns={columns}
            rows={items}
            rowKey={coupon => coupon.id}
            busy={loading || saving}
            caption="Coupons, with what each takes off, its window, its use count and its status"
            empty={
              loading
                ? 'Reading the coupons…'
                : 'No coupons yet. Add one and it stays switched off until you say otherwise.'
            }
          />
        </>
      )}

      {draft ? (
        <Sheet
          open
          onClose={() => {
            if (saving) return; // A save is in flight; losing the form now would lose the edit.
            setDraft(null);
            setConfirmDelete(false);
          }}
          eyebrow={draft.existing ? 'Coupon' : 'New coupon'}
          title={draft.existing ? draft.code || 'Coupon' : 'Add a coupon'}
          footer={
            <>
              <button type="button" onClick={saveDraft} className={ACTION} disabled={saving}>
                {saving ? 'Saving…' : draft.existing ? 'Save coupon' : 'Add coupon'}
              </button>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className={ACTION_SOFT}
                disabled={saving}
              >
                Cancel
              </button>

              {draft.existing ? (
                <span className="ml-auto">
                  {confirmDelete ? (
                    <span className="flex items-center gap-2">
                      <span className={META}>Delete this code?</span>
                      <button
                        type="button"
                        onClick={deleteDraft}
                        className={ACTION_DANGER}
                        disabled={saving}
                      >
                        Yes, delete it
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className={ACTION_SOFT}
                        disabled={saving}
                      >
                        Keep it
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className={ACTION_GRAVE}
                      disabled={saving}
                    >
                      <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
                      Delete
                    </button>
                  )}
                </span>
              ) : null}
            </>
          }
        >
          <div className="space-y-5">
            <Field
              id="coupon-code"
              label="Code"
              required
              error={problems.code}
              hint="What the customer types. Upper-cased and stripped of spaces when it is saved."
            >
              <TextInput
                id="coupon-code"
                value={draft.code}
                invalid={invalid('code')}
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="DIWALI20"
                onChange={event =>
                  setDraft({ ...draft, code: normalizeCouponCode(event.target.value) })
                }
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="coupon-kind" label="Discount">
                <SelectInput
                  id="coupon-kind"
                  value={draft.kind}
                  onChange={event =>
                    setDraft({ ...draft, kind: event.target.value as CouponKind })
                  }
                >
                  <option value="PERCENT">A percentage off</option>
                  <option value="AMOUNT">A rupee amount off</option>
                </SelectInput>
              </Field>

              <Field
                id="coupon-value"
                label={draft.kind === 'PERCENT' ? 'Percentage off' : 'Rupees off'}
                required
                error={problems.value}
                hint={draft.kind === 'PERCENT' ? '1 to 100.' : 'In rupees, e.g. 500.'}
              >
                <TextInput
                  id="coupon-value"
                  value={draft.value}
                  inputMode="decimal"
                  invalid={invalid('value')}
                  onChange={event => setDraft({ ...draft, value: event.target.value })}
                />
              </Field>
            </div>

            <Field
              id="coupon-min"
              label="Smallest order it applies to"
              error={problems.minSubtotal}
              hint="In rupees. Blank means it applies to any order."
            >
              <TextInput
                id="coupon-min"
                value={draft.minSubtotal}
                inputMode="decimal"
                invalid={invalid('minSubtotal')}
                onChange={event => setDraft({ ...draft, minSubtotal: event.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="coupon-starts"
                label="First day"
                hint="Blank means it is running already."
              >
                <TextInput
                  id="coupon-starts"
                  type="date"
                  value={draft.startsAt}
                  onChange={event => setDraft({ ...draft, startsAt: event.target.value })}
                />
              </Field>

              <Field
                id="coupon-ends"
                label="Last day"
                error={problems.endsAt}
                hint="Valid to the end of this day. Blank means it never expires."
              >
                <TextInput
                  id="coupon-ends"
                  type="date"
                  value={draft.endsAt}
                  invalid={invalid('endsAt')}
                  onChange={event => setDraft({ ...draft, endsAt: event.target.value })}
                />
              </Field>
            </div>

            <Field
              id="coupon-max"
              label="Total uses allowed"
              error={problems.maxUses}
              hint="Blank means no limit. Nothing counts a use yet, so this is a note of intent."
            >
              <TextInput
                id="coupon-max"
                value={draft.maxUses}
                inputMode="numeric"
                invalid={invalid('maxUses')}
                onChange={event => setDraft({ ...draft, maxUses: event.target.value })}
              />
            </Field>

            {/* Read, not edited. See the note at the head of this file: nothing in the shop
                moves this number, and a box for typing it would only invite a made-up one. */}
            <div>
              <p className={cn(LABEL, 'mb-1')}>Times used</p>
              <p className="text-[14px] text-[var(--ds-ink)] tabular-nums">{draft.usedCount}</p>
              <p className={cn(META, 'mt-1')}>
                Recorded against this code. It moves when a sale records the code; no checkout
                does that for you yet.
              </p>
            </div>

            <Field
              id="coupon-note"
              label="Note"
              hint="For the shop’s own reference. Customers never see it."
            >
              <textarea
                id="coupon-note"
                rows={2}
                value={draft.note}
                onChange={event => setDraft({ ...draft, note: event.target.value })}
                className={cn(INPUT, 'resize-y')}
              />
            </Field>

            <div className="border-t border-[var(--ds-line)] pt-4">
              <CheckboxField
                id="coupon-active"
                label="This code is live"
                checked={draft.active}
                onChange={active => setDraft({ ...draft, active })}
                hint="Switched off, the code is kept but honours nothing. A coupon whose last day has passed reads as expired whatever this says."
              />
            </div>

            {/* The same sentence the table will show, from the same function — so the owner
                reads the coupon back before saving it. Only drawn once the discount is a
                number: describing "NaN off" would be worse than describing nothing. */}
            {draft.code && NUMBER.test(draft.value.trim()) ? (
              <p className={cn(META, 'border-t border-[var(--ds-line)] pt-4')}>
                Reads as: {describeCoupon(toCoupon(draft))}
              </p>
            ) : null}
          </div>
        </Sheet>
      ) : null}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
