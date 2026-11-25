'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Columns3, Plus, Rows3, Trash2, X } from 'lucide-react';
import ScreenHead from '@/components/admin/ScreenHead';
import Notice from '@/components/admin/Notice';
import Toast, { type ToastMessage } from '@/components/admin/Toast';
import Field, { CheckboxField, TextInput } from '@/components/admin/Field';
import { SizeChartTable } from '@/components/features/products/size-chart';
import { request } from '@/lib/admin/api';
import { CHART_CATEGORIES, type SizeChart } from '@/lib/repositories/size-charts';
import { CATEGORY_MAPPING_REVERSE } from '@/lib/utils/product-utils';
import type { ProductType } from '@/types';
import {
  ACTION,
  ACTION_GRAVE,
  ACTION_QUIET,
  ACTION_SOFT,
  CARD,
  CARD_BODY,
  CARD_HEAD,
  INPUT,
  LABEL,
  META,
  ROW,
  SCREEN,
  SECTION_TITLE,
  TABLE_CELL,
  TABLE_HEAD,
  badge,
} from '@/components/admin/styles';
import { cn } from '@/lib/utils';

/**
 * Size charts: the measurement tables the shop publishes behind "Size guide" on a product page.
 *
 * WHY THIS SCREEN EXISTS. The product page has always carried a `Size Chart` link pointing at
 * `#`. The owner asked for a real chart, picked from the portal rather than compiled in. A
 * couture shop needs several — a lehenga, a blouse and a kurta are measured differently — so
 * this is a list of charts, each with its own columns, and a mapping from product category to
 * chart.
 *
 * NOTHING IS INVENTED HERE, AND THAT IS THE RULE THIS SCREEN EXISTS TO ENFORCE. A new chart
 * arrives with one column heading and no rows. It does not arrive with bust 34 / waist 28 /
 * hip 36 "for the owner to adjust", because a plausible table nobody checked is a table a
 * customer orders a garment from. Even the note field is left empty with its example in the
 * placeholder rather than in the value: "All measurements in inches" is a claim about this
 * shop's charts, and only the shop gets to make it.
 *
 * THE TABLE EDITOR IS THE SCREEN. Everything else — the name, the note, the categories, the
 * visible switch — is a form field anyone could have written. Typing a 5x6 grid of measurements
 * is the actual work, and it is done often enough that the keyboard has to be right: see
 * `onCellKeyDown` for exactly which keys are intercepted and, more importantly, which are not.
 *
 * SAVING IS WHOLESALE, like the other content screens: the list is short and ordered, so the
 * screen sends what the owner is looking at and the server replaces the row. The response is
 * the parsed result, and the screen adopts it — so if the server reshaped anything (padded a
 * row, made a slug unique) the editor is looking at what the shop will serve, not at a draft
 * that happens to differ.
 */

/** A fresh chart. One column, no rows: a frame to fill, not a table to correct. */
function blankChart(): SizeChart {
  return {
    id: `sc-${Date.now().toString(36)}`,
    // Left empty: the server derives the handle from the name on first save and it is sent
    // back here, so a later rename does not change a chart's identity.
    slug: '',
    name: '',
    note: '',
    // A column HEADING is a label, not a measurement — nothing about "Size" asserts a number.
    // It is pre-filled only so the grid has something to draw before the first click.
    columns: ['Size'],
    rows: [],
    categories: [],
    visible: true,
  };
}

export default function SizeChartsPage() {
  const [charts, setCharts] = useState<SizeChart[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState('');
  const [notSetUp, setNotSetUp] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  /** A cell that does not exist yet, waiting for the render that creates it. See `focusCell`. */
  const pendingFocus = useRef<string | null>(null);

  /**
   * Put the cursor in a cell, addressed `row:column` with `-1` for the heading row.
   *
   * Navigating between cells that already exist is done immediately — it is a DOM operation,
   * there is no state to change, and routing it through a re-render would make every arrow
   * press re-draw the grid. A cell that is not rendered yet (Enter in the last row, which adds
   * one) cannot be focused now at all, so the address is parked in a ref and the effect below
   * claims it on the commit that creates the row. A ref rather than state because this is a
   * message to the DOM, not a fact about the chart, and it must not cause a render of its own.
   */
  const focusCell = useCallback((key: string) => {
    const input = gridRef.current?.querySelector<HTMLInputElement>(`[data-cell="${key}"]`);
    if (!input) {
      pendingFocus.current = key;
      return;
    }
    input.focus();
    // Selected, not merely focused: arriving in a cell by arrow is the moment you overwrite it,
    // which is what every spreadsheet does and what muscle memory expects.
    input.select();
  }, []);

  // No dependency array on purpose: the pending address can be set by any handler, and the
  // render that makes the row real is the only moment this can act.
  useEffect(() => {
    const key = pendingFocus.current;
    if (!key) return;
    pendingFocus.current = null;
    const input = gridRef.current?.querySelector<HTMLInputElement>(`[data-cell="${key}"]`);
    input?.focus();
    input?.select();
  });

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      const answer = await request<{ charts: SizeChart[] }>('/api/admin/size-charts', {
        signal: controller.signal,
      });
      if (answer.aborted) return;
      if (answer.notSetUp) setNotSetUp(true);
      else if (!answer.ok) setFailure(answer.message);
      else if (answer.data) {
        setCharts(answer.data.charts);
        setSelectedId(answer.data.charts[0]?.id ?? null);
      }
      setLoading(false);
    })();

    return () => controller.abort();
  }, []);

  const selected = charts.find(chart => chart.id === selectedId) ?? null;

  const patch = useCallback(
    (id: string, change: Partial<SizeChart>) => {
      setCharts(current =>
        current.map(chart => (chart.id === id ? { ...chart, ...change } : chart))
      );
      setDirty(true);
    },
    []
  );

  /** Change the selected chart. Every table operation below goes through this. */
  const patchSelected = useCallback(
    (change: Partial<SizeChart>) => {
      if (!selected) return;
      patch(selected.id, change);
    },
    [patch, selected]
  );

  /* -------------------------------------------------------------------------------------- */
  /* The chart list                                                                          */
  /* -------------------------------------------------------------------------------------- */

  function addChart() {
    const chart = blankChart();
    setCharts(current => [...current, chart]);
    setSelectedId(chart.id);
    setDirty(true);
  }

  function moveChart(from: number, to: number) {
    if (to < 0 || to >= charts.length || from === to) return;
    setCharts(current => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDirty(true);
  }

  function removeChart(id: string) {
    setCharts(current => {
      const next = current.filter(chart => chart.id !== id);
      if (id === selectedId) setSelectedId(next[0]?.id ?? null);
      return next;
    });
    setDirty(true);
  }

  /* -------------------------------------------------------------------------------------- */
  /* The table editor                                                                        */
  /* -------------------------------------------------------------------------------------- */

  /*
   * Every operation keeps the rows exactly as wide as the columns. The parser would reshape a
   * mismatch rather than refuse it, but doing it here as well is what makes the live preview
   * and the saved chart the same object — a preview drawn from a grid that is one column out
   * of step is a preview of something the shop will never serve.
   */

  function addColumn() {
    if (!selected) return;
    patchSelected({
      columns: [...selected.columns, ''],
      rows: selected.rows.map(row => [...row, '']),
    });
    focusCell(`-1:${selected.columns.length}`);
  }

  function removeColumn(index: number) {
    if (!selected) return;
    if (selected.columns.length === 1) {
      setToast({
        tone: 'error',
        text: 'A chart needs at least one column. Delete the whole chart instead if it is not wanted.',
      });
      return;
    }
    patchSelected({
      columns: selected.columns.filter((_, at) => at !== index),
      rows: selected.rows.map(row => row.filter((_, at) => at !== index)),
    });
  }

  function renameColumn(index: number, value: string) {
    if (!selected) return;
    patchSelected({
      columns: selected.columns.map((column, at) => (at === index ? value : column)),
    });
  }

  function addRow(focusColumn = 0) {
    if (!selected) return;
    patchSelected({ rows: [...selected.rows, selected.columns.map(() => '')] });
    focusCell(`${selected.rows.length}:${focusColumn}`);
  }

  function removeRow(index: number) {
    if (!selected) return;
    patchSelected({ rows: selected.rows.filter((_, at) => at !== index) });
  }

  function moveRow(from: number, to: number) {
    if (!selected || to < 0 || to >= selected.rows.length || from === to) return;
    const rows = [...selected.rows];
    const [moved] = rows.splice(from, 1);
    rows.splice(to, 0, moved);
    patchSelected({ rows });
  }

  function setCell(row: number, column: number, value: string) {
    if (!selected) return;
    patchSelected({
      rows: selected.rows.map((cells, at) =>
        at === row ? cells.map((cell, col) => (col === column ? value : cell)) : cells
      ),
    });
  }

  /**
   * The grid's keyboard, and the list of keys it leaves alone is the important half.
   *
   * INTERCEPTED. Up and down move between rows in the same column, with the heading row as the
   * top stop — in a single-line text input those keys otherwise only jump the caret to the
   * start or end of the value, which is a key press doing nothing anyone asked for. Enter moves
   * down too, and on the last row it adds one and lands in it, so a chart can be typed from the
   * first cell to the last without reaching for the mouse once.
   *
   * NOT INTERCEPTED, DELIBERATELY. Left and right still move the caret inside the cell, because
   * a cell holds "34–36" and editing it character by character is normal. Tab still moves to
   * the next control in document order, which in this grid is the next cell along the row and
   * then the row's own buttons — the browser's own behaviour, already correct, and hijacking it
   * would break the one navigation key a keyboard user trusts everywhere else. Home, End and
   * the selection shortcuts are likewise the platform's.
   */
  function onCellKeyDown(event: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) {
    if (!selected) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const lastRow = selected.rows.length - 1;

    if (event.key === 'ArrowDown' || (event.key === 'Enter' && !event.shiftKey)) {
      event.preventDefault();
      if (row < lastRow) {
        focusCell(`${row + 1}:${col}`);
      } else if (event.key === 'Enter') {
        addRow(col);
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (row > -1) focusCell(`${row - 1}:${col}`);
    }
  }

  /* -------------------------------------------------------------------------------------- */
  /* Saving                                                                                  */
  /* -------------------------------------------------------------------------------------- */

  async function save() {
    // The server drops a chart with no name, which would silently delete one the owner had
    // just added and not yet titled. Better to say so and save nothing.
    const unnamed = charts.filter(chart => chart.name.trim() === '').length;
    if (unnamed > 0) {
      setToast({
        tone: 'error',
        text:
          unnamed === 1
            ? 'One chart has no name. Name it or delete it, then save.'
            : `${unnamed} charts have no name. Name them or delete them, then save.`,
      });
      return;
    }

    setSaving(true);
    const answer = await request<{ charts: SizeChart[] }>('/api/admin/size-charts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ charts }),
    });
    setSaving(false);

    if (!answer.ok) {
      setToast({ tone: 'error', text: answer.message });
      return;
    }
    if (answer.data) {
      setCharts(answer.data.charts);
      // Ids survive a round trip, but a chart dropped server-side would leave the selection
      // pointing at nothing.
      const stillThere = answer.data.charts.some(chart => chart.id === selectedId);
      if (!stillThere) setSelectedId(answer.data.charts[0]?.id ?? null);
    }
    setDirty(false);
    setToast({ tone: 'ok', text: 'Saved. Product pages show these within a minute.' });
  }

  /**
   * Which chart a category currently falls back to — the same rule the storefront applies
   * (first visible chart listing it), computed here so the screen can say so.
   *
   * It is on the screen because the rule is otherwise invisible: tick "Lehengas" on a second
   * chart and nothing appears to happen, because the first one still wins. Saying which chart
   * holds a category, and that order decides it, is the difference between a switch and a
   * guess.
   */
  function winnerFor(category: ProductType): SizeChart | null {
    return charts.find(chart => chart.visible && chart.categories.includes(category)) ?? null;
  }

  function toggleCategory(category: ProductType, on: boolean) {
    if (!selected) return;
    patchSelected({
      categories: on
        ? [...selected.categories, category]
        : selected.categories.filter(entry => entry !== category),
    });
  }

  return (
    <div className={SCREEN}>
      <ScreenHead
        title="Size charts"
        note="The measurement tables behind the Size guide on a product page. A product shows the first visible chart listing its category."
        actions={
          <>
            <button type="button" onClick={addChart} className={ACTION_SOFT} disabled={notSetUp}>
              <Plus size={15} strokeWidth={1.75} aria-hidden="true" />
              Add chart
            </button>
            <button
              type="button"
              onClick={save}
              className={ACTION}
              disabled={!dirty || saving || notSetUp}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </>
        }
      />

      {notSetUp ? (
        <Notice label="Not set up yet">
          The settings table is not in this database yet, so size charts cannot be stored.
          Product pages keep showing no size guide at all.
        </Notice>
      ) : failure ? (
        <Notice label="Problem" tone="problem">
          {failure}
        </Notice>
      ) : loading ? (
        <Notice label="Loading" tone="working">
          Reading the size charts.
        </Notice>
      ) : (
        <div className="space-y-4">
          {charts.length === 0 ? (
            <Notice label="No charts yet">
              No size chart has been set up, so no product page shows a size guide. Add a chart,
              give it the columns this shop measures by, and tick the categories it applies to.
              Nothing is filled in for you: the measurements a customer orders from have to be
              the shop&apos;s own.
            </Notice>
          ) : (
            <div className={CARD}>
              <div className={CARD_HEAD}>
                <h2 className={SECTION_TITLE}>Charts</h2>
                <p className={META}>
                  {charts.length === 1 ? '1 chart' : `${charts.length} charts`} · the order
                  decides which one wins a shared category
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th scope="col" className={TABLE_HEAD}>
                        Chart
                      </th>
                      <th scope="col" className={TABLE_HEAD}>
                        Table
                      </th>
                      <th scope="col" className={TABLE_HEAD}>
                        Categories
                      </th>
                      <th scope="col" className={cn(TABLE_HEAD, 'text-right')}>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {charts.map((chart, index) => (
                      <tr
                        key={chart.id}
                        className={cn(
                          ROW,
                          'border-t border-[var(--ds-line)]',
                          chart.id === selectedId && 'bg-[var(--ds-accent-wash)]'
                        )}
                      >
                        <td className={TABLE_CELL}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(chart.id)}
                            className={cn(ACTION_QUIET, 'max-w-[220px] justify-start')}
                            aria-current={chart.id === selectedId ? 'true' : undefined}
                          >
                            <span className="truncate">{chart.name.trim() || 'Untitled chart'}</span>
                          </button>
                          {chart.visible ? null : (
                            <span className={cn(badge(), 'ml-1')}>Hidden</span>
                          )}
                        </td>
                        <td className={TABLE_CELL}>
                          {chart.columns.length} × {chart.rows.length}
                          {chart.rows.length === 0 ? (
                            <span className={cn(badge('warn'), 'ml-2')}>No rows yet</span>
                          ) : null}
                        </td>
                        <td className={TABLE_CELL}>
                          {chart.categories.length === 0
                            ? '—'
                            : chart.categories
                                .map(category => CATEGORY_MAPPING_REVERSE[category])
                                .join(', ')}
                        </td>
                        <td className={cn(TABLE_CELL, 'text-right whitespace-nowrap')}>
                          <button
                            type="button"
                            onClick={() => moveChart(index, index - 1)}
                            disabled={index === 0}
                            aria-label={`Move ${chart.name || 'this chart'} up`}
                            className={ACTION_QUIET}
                          >
                            <ArrowUp size={15} strokeWidth={1.75} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveChart(index, index + 1)}
                            disabled={index === charts.length - 1}
                            aria-label={`Move ${chart.name || 'this chart'} down`}
                            className={ACTION_QUIET}
                          >
                            <ArrowDown size={15} strokeWidth={1.75} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeChart(chart.id)}
                            aria-label={`Delete ${chart.name || 'this chart'}`}
                            className={ACTION_GRAVE}
                          >
                            <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selected ? (
            <>
              <div className={CARD}>
                <div className={CARD_HEAD}>
                  <h2 className={SECTION_TITLE}>
                    {selected.name.trim() || 'Untitled chart'}
                  </h2>
                  {selected.slug ? <p className={META}>Handle: {selected.slug}</p> : null}
                </div>
                <div className={cn(CARD_BODY, 'space-y-4')}>
                  <Field
                    id={`name-${selected.id}`}
                    label="Chart name"
                    required
                    hint="What the garment is measured as — Lehenga, Blouse, Kurta. It titles the size guide on the shop."
                  >
                    <TextInput
                      id={`name-${selected.id}`}
                      value={selected.name}
                      onChange={event => patchSelected({ name: event.target.value })}
                    />
                  </Field>

                  <Field
                    id={`note-${selected.id}`}
                    label="Note under the table"
                    hint="Units, how to measure, what made-to-measure means for this garment. Left blank it is not shown."
                  >
                    <textarea
                      id={`note-${selected.id}`}
                      rows={3}
                      value={selected.note}
                      /* The example lives in the placeholder, not in the value: a note about
                         inches or made-to-measure is a statement about this shop's charts, and
                         a pre-filled one would be published the first time anyone saved. */
                      placeholder="e.g. All measurements in inches. Made-to-measure garments are cut to your own measurements."
                      onChange={event => patchSelected({ note: event.target.value })}
                      className={cn(INPUT, 'resize-y')}
                    />
                  </Field>

                  <div>
                    <p className={cn(LABEL, 'mb-2')}>Categories that use this chart</p>
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                      {CHART_CATEGORIES.map(category => {
                        const winner = winnerFor(category);
                        const taken =
                          winner && winner.id !== selected.id
                            ? `${winner.name.trim() || 'Another chart'} already wins this category — move this chart above it to take over.`
                            : undefined;
                        return (
                          <CheckboxField
                            key={category}
                            id={`cat-${selected.id}-${category}`}
                            label={CATEGORY_MAPPING_REVERSE[category]}
                            checked={selected.categories.includes(category)}
                            onChange={on => toggleCategory(category, on)}
                            hint={selected.categories.includes(category) ? taken : undefined}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <CheckboxField
                    id={`visible-${selected.id}`}
                    label="Show this chart on the shop"
                    checked={selected.visible}
                    onChange={visible => patchSelected({ visible })}
                    hint="Off takes it down without deleting it. Product pages then show no size guide unless another chart covers the category."
                  />
                </div>
              </div>

              <div className={CARD}>
                <div className={CARD_HEAD}>
                  <div className="min-w-0">
                    <h2 className={SECTION_TITLE}>Measurements</h2>
                    <p className={cn(META, 'mt-0.5')}>
                      Tab moves along a row, Enter and the up and down arrows move between rows,
                      and Enter in the last row adds one. Left and right still move the cursor
                      inside a cell. Cells are free text: &ldquo;34–36&rdquo; and &ldquo;made to
                      order&rdquo; are both fine.
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={addColumn} className={ACTION_SOFT}>
                      <Columns3 size={15} strokeWidth={1.75} aria-hidden="true" />
                      Add column
                    </button>
                    <button type="button" onClick={() => addRow(0)} className={ACTION_SOFT}>
                      <Rows3 size={15} strokeWidth={1.75} aria-hidden="true" />
                      Add row
                    </button>
                  </div>
                </div>

                <div ref={gridRef} className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th scope="col" className={cn(TABLE_HEAD, 'w-12')}>
                          <span className="sr-only">Row</span>#
                        </th>
                        {selected.columns.map((column, index) => (
                          <th
                            key={index}
                            scope="col"
                            className={cn(TABLE_HEAD, 'min-w-[180px] align-bottom')}
                          >
                            <div className="flex items-center gap-1">
                              <TextInput
                                id={`column-${selected.id}-${index}`}
                                data-cell={`-1:${index}`}
                                aria-label={`Heading for column ${index + 1}`}
                                value={column}
                                placeholder={`Column ${index + 1}`}
                                onChange={event => renameColumn(index, event.target.value)}
                                onKeyDown={event => onCellKeyDown(event, -1, index)}
                              />
                              <button
                                type="button"
                                onClick={() => removeColumn(index)}
                                aria-label={`Remove column ${column || index + 1}`}
                                className={ACTION_GRAVE}
                              >
                                <X size={14} strokeWidth={1.75} aria-hidden="true" />
                              </button>
                            </div>
                          </th>
                        ))}
                        <th scope="col" className={cn(TABLE_HEAD, 'text-right')}>
                          <span className="sr-only">Row actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.rows.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className={cn(ROW, 'border-t border-[var(--ds-line)]')}
                        >
                          <td className={cn(TABLE_CELL, 'tabular-nums')}>{rowIndex + 1}</td>
                          {row.map((value, colIndex) => (
                            <td key={colIndex} className="px-2 py-1.5">
                              <TextInput
                                id={`cell-${selected.id}-${rowIndex}-${colIndex}`}
                                data-cell={`${rowIndex}:${colIndex}`}
                                aria-label={`${
                                  selected.columns[colIndex] || `Column ${colIndex + 1}`
                                }, row ${rowIndex + 1}`}
                                value={value}
                                onChange={event => setCell(rowIndex, colIndex, event.target.value)}
                                onKeyDown={event => onCellKeyDown(event, rowIndex, colIndex)}
                              />
                            </td>
                          ))}
                          <td className={cn(TABLE_CELL, 'text-right whitespace-nowrap')}>
                            <button
                              type="button"
                              onClick={() => moveRow(rowIndex, rowIndex - 1)}
                              disabled={rowIndex === 0}
                              aria-label={`Move row ${rowIndex + 1} up`}
                              className={ACTION_QUIET}
                            >
                              <ArrowUp size={15} strokeWidth={1.75} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveRow(rowIndex, rowIndex + 1)}
                              disabled={rowIndex === selected.rows.length - 1}
                              aria-label={`Move row ${rowIndex + 1} down`}
                              className={ACTION_QUIET}
                            >
                              <ArrowDown size={15} strokeWidth={1.75} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeRow(rowIndex)}
                              aria-label={`Remove row ${rowIndex + 1}`}
                              className={ACTION_GRAVE}
                            >
                              <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selected.rows.length === 0 ? (
                  <div className={CARD_BODY}>
                    <p className={META}>
                      No rows yet. Add one for each size this chart covers. A chart with no rows
                      is not published — the product page shows no size guide until it has some.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className={CARD}>
                <div className={CARD_HEAD}>
                  <h2 className={SECTION_TITLE}>Preview</h2>
                  <p className={META}>Exactly what the shop draws inside the size guide.</p>
                </div>
                {/*
                  The one place in the portal that renders storefront markup, and on purpose:
                  this is the shop's own `SizeChartTable`, not a copy of it. A preview built
                  from its own classes is a preview that can quietly disagree with the live
                  page, which makes it worse than no preview at all. The frame around it is
                  still the portal's.
                */}
                <div className={CARD_BODY}>
                  <SizeChartTable chart={selected} />
                </div>
              </div>
            </>
          ) : charts.length > 0 ? (
            <Notice label="Nothing selected">
              Pick a chart above to edit its measurements.
            </Notice>
          ) : null}
        </div>
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
