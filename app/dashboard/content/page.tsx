'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import ScreenHead from '@/components/admin/ScreenHead';
import Notice from '@/components/admin/Notice';
import Toast, { type ToastMessage } from '@/components/admin/Toast';
import {
  ACTION,
  ACTION_SOFT,
  CARD,
  FOCUS,
  META,
  SCREEN,
  SECTION_TITLE,
  TAB,
  TAB_ON,
  TABS,
  badge,
} from '@/components/admin/styles';
import { cn } from '@/lib/utils';
import { request, send } from '@/lib/admin/api';
import BlockEditor, {
  differs,
  type Block,
  type SaveState,
} from './block-editor';

/**
 * Content: every line of copy on the public pages, as a draft that autosaves and a publish
 * that does not happen by itself.
 *
 * **The two columns are the whole design.** A `ContentBlock` holds `draft` and `published`.
 * Typing writes `draft` — debounced, 800ms after the last keystroke — and the storefront reads
 * `published`, so the client can rewrite a paragraph over an afternoon with nothing changing on
 * the shop until they say so. Publish copies one block, one section or one page across.
 *
 * **Grouped, and closed to begin with.** The seed writes a block per leaf of `siteCopy`:
 * nearly four hundred of them across eleven pages. A flat list of four hundred fields is not
 * an editor, so blocks are grouped by page and then by section, and a section opens when it is
 * asked for — which also keeps four hundred inputs (and any TipTap instance among them) out of
 * the DOM.
 *
 * **Publishing says what actually happened.** `POST /api/admin/content/publish` answers
 * `{ published, revalidated }`. The rows are written either way; `revalidated: false` means the
 * cached page may serve the old words for a few minutes. The toast says so rather than
 * claiming the change is live, because a client who refreshes and sees the old text would
 * otherwise conclude the portal had lied — which it would have.
 *
 * Pending autosaves are flushed before a publish. Without that, pressing Publish within the
 * debounce window would publish the previous draft and leave the newest words behind — a save
 * that looked like it worked, a publish that looked like it worked, and the wrong text on the
 * shop.
 */

const AUTOSAVE_MS = 800;

/** `shopByStyle` -> `Shop by style`. Section keys are camelCase in the seed. */
function humanise(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

interface Group {
  name: string;
  blocks: Block[];
  changed: number;
}

export default function ContentPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});
  const [saves, setSaves] = useState<Record<string, SaveState>>({});
  const [page, setPage] = useState('');
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [publishing, setPublishing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notSetUp, setNotSetUp] = useState(false);
  const [failure, setFailure] = useState('');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  /** One pending autosave per block key. Flushed before a publish, cleared on unmount. */
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const latest = useRef(new Map<string, unknown>());

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      const answer = await request<{ blocks: Block[]; pages: string[] }>('/api/admin/content', {
        signal: controller.signal,
      });
      if (answer.aborted) return;

      if (answer.ok && answer.data) {
        setBlocks(answer.data.blocks);
        setPages(answer.data.pages);
        setDrafts(Object.fromEntries(answer.data.blocks.map(block => [block.key, block.draft])));
        setPage(current => current || answer.data!.pages[0] || '');
        setFailure('');
        setNotSetUp(false);
      } else {
        setNotSetUp(answer.notSetUp);
        setFailure(answer.notSetUp ? '' : answer.message);
      }
      setLoading(false);
    };

    load();
    return () => controller.abort();
  }, []);

  // Timers outlive a render but must not outlive the screen.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const changedKeys = useMemo(
    () => blocks.filter(block => differs(drafts[block.key], block.published)).map(b => b.key),
    [blocks, drafts]
  );

  const changedPerPage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const block of blocks) {
      if (differs(drafts[block.key], block.published)) {
        counts[block.page] = (counts[block.page] ?? 0) + 1;
      }
    }
    return counts;
  }, [blocks, drafts]);

  const groups = useMemo<Group[]>(() => {
    const order: string[] = [];
    const bySection = new Map<string, Block[]>();
    for (const block of blocks) {
      if (block.page !== page) continue;
      if (!bySection.has(block.section)) {
        bySection.set(block.section, []);
        order.push(block.section);
      }
      bySection.get(block.section)!.push(block);
    }
    return order.map(name => {
      const sectionBlocks = bySection.get(name)!;
      return {
        name,
        blocks: sectionBlocks,
        changed: sectionBlocks.filter(block => differs(drafts[block.key], block.published)).length,
      };
    });
  }, [blocks, page, drafts]);

  async function persist(key: string, value: unknown) {
    timers.current.delete(key);
    setSaves(current => ({ ...current, [key]: { state: 'saving' } }));

    const answer = await send(`/api/admin/content/${encodeURIComponent(key)}`, 'PUT', { value });
    setSaves(current => ({
      ...current,
      [key]: answer.ok ? { state: 'saved' } : { state: 'error', message: answer.message },
    }));
    return answer.ok;
  }

  function edit(key: string, value: unknown) {
    setDrafts(current => ({ ...current, [key]: value }));
    latest.current.set(key, value);
    setSaves(current => ({ ...current, [key]: { state: 'idle' } }));

    const existing = timers.current.get(key);
    if (existing) clearTimeout(existing);
    timers.current.set(
      key,
      setTimeout(() => {
        void persist(key, latest.current.get(key));
      }, AUTOSAVE_MS)
    );
  }

  /** Write anything still waiting on its debounce, so a publish publishes what is on screen. */
  async function flush(keys: string[]) {
    const waiting = keys.filter(key => timers.current.has(key));
    for (const key of waiting) {
      clearTimeout(timers.current.get(key)!);
      timers.current.delete(key);
      await persist(key, latest.current.get(key));
    }
  }

  async function publish(keys: string[], what: string) {
    if (keys.length === 0) return;
    setPublishing(keys);
    await flush(keys);

    const answer = await send<{ published: string[]; revalidated: boolean }>(
      '/api/admin/content/publish',
      'POST',
      { keys }
    );
    setPublishing([]);

    if (!answer.ok || !answer.data) {
      setToast({ text: answer.message, tone: 'error' });
      return;
    }

    const done = new Set(answer.data.published);
    if (done.size === 0) {
      setToast({ text: 'Nothing was published: the server recognised none of those blocks.', tone: 'error' });
      return;
    }

    setBlocks(current =>
      current.map(block =>
        done.has(block.key) ? { ...block, published: drafts[block.key] ?? block.draft } : block
      )
    );

    setToast({
      text: answer.data.revalidated
        ? `${what} is live on the shop now.`
        : `${what} is saved and will appear on the shop within a few minutes — the cached pages could not be refreshed just now.`,
      tone: 'ok',
    });
  }

  const busy = publishing.length > 0;

  return (
    <div className={SCREEN}>
      <ScreenHead
        title="Content"
        note="Every word on the public pages. Edits save themselves as drafts; the shop changes only when you publish."
        actions={
          changedKeys.length > 0 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => publish(changedKeys, `All ${changedKeys.length} changes`)}
              className={ACTION}
            >
              Publish all {changedKeys.length}
            </button>
          ) : null
        }
      />

      {notSetUp ? (
        <Notice label="Not set up yet">
          The content tables are not in this database yet, so there is nothing to edit. Once the
          CMS migration has been applied and the copy has been seeded, every line on the public
          pages appears here, grouped by page.
        </Notice>
      ) : failure ? (
        <Notice label="Problem" tone="problem">
          {failure}
        </Notice>
      ) : loading ? (
        <Notice label="Loading" tone="working">
          Reading the page copy…
        </Notice>
      ) : blocks.length === 0 ? (
        <Notice label="Nothing yet">
          The content tables exist but hold no copy. Run the CMS seed to fill them from the words
          the site ships with.
        </Notice>
      ) : (
        <>
          {/* Eleven pages, so tabs that scroll rather than wrap: a nav that reflows to three
              rows moves the sections down the screen every time a page is renamed. The count
              on a tab is the number of blocks on that page waiting to be published. */}
          <nav aria-label="Pages" className="mb-4">
            <ul className={cn(TABS, 'ds-scroll overflow-x-auto')}>
              {pages.map(name => (
                <li key={name} className="shrink-0">
                  <button
                    type="button"
                    aria-current={name === page ? 'page' : undefined}
                    onClick={() => setPage(name)}
                    className={cn(TAB, name === page && TAB_ON)}
                  >
                    {humanise(name)}
                    {changedPerPage[name] ? (
                      <span className={badge('accent')}>{changedPerPage[name]}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {groups.map(group => {
            const open = openSections.includes(`${page}.${group.name}`);
            const keys = group.blocks
              .filter(block => differs(drafts[block.key], block.published))
              .map(block => block.key);

            return (
              /* One card per section, collapsed to its header until it is asked for. The
                 header is the disclosure button, which is why the publish action sits beside
                 it rather than inside it: nesting a button in a button is invalid markup and
                 un-clickable with a keyboard. */
              <section key={`${page}.${group.name}`} className={cn(CARD, 'mb-3')}>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-2 py-2">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() =>
                      setOpenSections(current =>
                        current.includes(`${page}.${group.name}`)
                          ? current.filter(name => name !== `${page}.${group.name}`)
                          : [...current, `${page}.${group.name}`]
                      )
                    }
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-[var(--ds-surface-sunk)]',
                      FOCUS
                    )}
                  >
                    <ChevronRight
                      size={15}
                      strokeWidth={2}
                      aria-hidden="true"
                      className={cn(
                        'shrink-0 text-[var(--ds-faint)] transition-transform motion-reduce:transition-none',
                        open && 'rotate-90'
                      )}
                    />
                    <span className={cn(SECTION_TITLE, 'min-w-0 truncate')}>
                      {humanise(group.name)}
                    </span>
                    <span className={cn(META, 'shrink-0')}>
                      {group.blocks.length} {group.blocks.length === 1 ? 'field' : 'fields'}
                    </span>
                    {group.changed > 0 ? (
                      <span className={badge('accent')}>{group.changed} unpublished</span>
                    ) : null}
                  </button>

                  {group.changed > 0 ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => publish(keys, `${humanise(group.name)}`)}
                      className={cn(ACTION_SOFT, 'mr-1')}
                    >
                      Publish section
                    </button>
                  ) : null}
                </div>

                {open ? (
                  <div className="border-t border-[var(--ds-line)] px-4 pt-1 pb-2">
                    {group.blocks.map(block => (
                      <BlockEditor
                        key={block.key}
                        block={block}
                        value={drafts[block.key]}
                        onChange={value => edit(block.key, value)}
                        save={saves[block.key] ?? { state: 'idle' }}
                        publishing={publishing.includes(block.key)}
                        onPublish={() => publish([block.key], `“${block.label.split(' / ').pop()}”`)}
                      />
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </>
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
