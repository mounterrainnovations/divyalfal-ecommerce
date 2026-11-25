import { describe, expect, it } from 'vitest';
import { csvField, csvFilename, reportCsvText, reportToCsv, toCsv } from './csv';
import { plottableReport, sampleReport } from './report-fixture';

/**
 * The export is the copy that leaves the building — mailed to an accountant, opened in a
 * spreadsheet, kept. Two things can go wrong with it and both are invisible: a field that breaks
 * the row it is in, and a column of figures that arrives without the sentence explaining what it
 * does and does not include. `csvField` is checked against every character that needs quoting;
 * the document is checked for the caveats it has to carry.
 */

describe('csvField', () => {
  it('leaves a plain field alone', () => {
    expect(csvField('Banarasi Red Silk Saree')).toBe('Banarasi Red Silk Saree');
    expect(csvField('SAREE')).toBe('SAREE');
  });

  it('quotes a field containing the delimiter', () => {
    // Unquoted, this one field becomes two and every column after it in the row shifts.
    expect(csvField('Saree, red')).toBe('"Saree, red"');
  });

  it('quotes a field containing a quote, and doubles the quote', () => {
    expect(csvField('The "Benares" Saree')).toBe('"The ""Benares"" Saree"');
    expect(csvField('"')).toBe('""""');
  });

  it('quotes a field containing a newline, in either convention', () => {
    expect(csvField('line one\nline two')).toBe('"line one\nline two"');
    expect(csvField('line one\r\nline two')).toBe('"line one\r\nline two"');
    expect(csvField('ends with a return\r')).toBe('"ends with a return\r"');
  });

  it('quotes a field whose own spacing matters', () => {
    // Legal unquoted, but readers disagree about whether to keep it, and a name that loses its
    // spacing in one spreadsheet and keeps it in another is a difference nobody can see.
    expect(csvField(' leading')).toBe('" leading"');
    expect(csvField('trailing ')).toBe('"trailing "');
    expect(csvField('inner space')).toBe('inner space');
  });

  it('writes numbers bare, so a spreadsheet can add the column up', () => {
    expect(csvField(48000)).toBe('48000');
    expect(csvField(0)).toBe('0');
    expect(csvField(8000.5)).toBe('8000.5');
  });

  it('writes an absent value as an empty field rather than as "null"', () => {
    expect(csvField(null)).toBe('');
    expect(csvField(undefined)).toBe('');
    expect(csvField('')).toBe('');
  });
});

describe('toCsv', () => {
  it('joins fields with commas and records with CRLF', () => {
    expect(
      toCsv([
        ['a', 'b'],
        [1, 2],
      ])
    ).toBe('a,b\r\n1,2');
  });

  it('writes an empty row as an empty line, which is how sections are separated', () => {
    expect(toCsv([['a'], [], ['b']])).toBe('a\r\n\r\nb');
  });

  it('escapes while joining, so a row with a comma in it is still one row', () => {
    const text = toCsv([
      ['Product', 'Units'],
      ['Saree, red', 8],
    ]);
    expect(text).toBe('Product,Units\r\n"Saree, red",8');
    // Two records, whatever is inside the fields.
    expect(text.split('\r\n')).toHaveLength(2);
  });
});

describe('csvFilename', () => {
  it('names the range and the day, with both padded', () => {
    expect(csvFilename('12m', new Date(2026, 10, 25))).toBe('divyafal-reports-12m-2026-11-25.csv');
    expect(csvFilename('all', new Date(2026, 0, 5))).toBe('divyafal-reports-all-2026-01-05.csv');
  });
});

describe('reportToCsv', () => {
  const rows = reportToCsv(sampleReport());
  const text = reportCsvText(sampleReport());

  /** The first cell of each row, which is where every section heading and label sits. */
  const firstCells = rows.map(row => String(row[0] ?? ''));

  it('states the window and the revenue basis before any figure', () => {
    expect(rows[0][0]).toBe('Divyafal — shop report');
    expect(rows.find(row => row[0] === 'Window')?.[1]).toBe('1 Dec 2025 to 25 Nov 2026');
    expect(String(rows.find(row => row[0] === 'Revenue basis')?.[1])).toMatch(
      /except cancelled and returned orders/
    );
  });

  it('carries every section the screen shows', () => {
    for (const heading of [
      'Headline figures',
      'Orders by month',
      'Orders by status',
      'Orders by payment status',
      'Top products',
      'Catalogue mix',
      'Stock',
      'Enquiries',
      'Payments recorded by the gateway',
    ]) {
      expect(firstCells).toContain(heading);
    }
  });

  it('writes the revenue figure beside the orders it excludes, not on its own', () => {
    const revenue = rows.find(row => row[0] === 'Revenue (₹)');
    expect(revenue?.[1]).toBe(48000);
    expect(String(revenue?.[2])).toMatch(/cancelled and returned ones are excluded/);

    const excluded = rows.find(row => row[0] === 'Excluded from revenue (₹)');
    expect(excluded?.[1]).toBe(18000);
    expect(excluded?.[2]).toBe('2 cancelled or returned orders');
  });

  /**
   * The point of the whole exercise: the file must not contain a column of twelve monthly
   * figures with no statement that eleven of them are zero and no trend was found.
   */
  it('says in the file that the series was not plotted, and why', () => {
    const verdict = rows.find(row => row[0] === 'Not plotted');
    expect(verdict).toBeDefined();
    expect(String(verdict?.[1])).toMatch(/All 8 orders in this window fall in 1 of its 12 months/);
    // And the figures are still there, all twelve of them.
    expect(rows.filter(row => String(row[0]).startsWith('2026-')).length).toBeGreaterThanOrEqual(
      11
    );
  });

  it('says so differently when the series was plotted', () => {
    const plotted = reportToCsv(plottableReport());
    expect(plotted.some(row => row[0] === 'Plotted on the screen')).toBe(true);
    expect(plotted.some(row => row[0] === 'Not plotted')).toBe(false);
  });

  it('carries the unknown-stock sentence with the real counts in it', () => {
    expect(text).toContain(
      '13 of 15 products have no size recorded at all, so their stock is unknown rather than zero'
    );
    expect(rows.find(row => row[0] === 'Units counted')?.[1]).toBe(56);
    expect(rows.find(row => row[0] === 'Units recorded')?.[1]).toBe(1055);
  });

  it('reports the made-to-order placeholder as its own line rather than as stock', () => {
    expect(firstCells).toContain(
      'Placeholder sizes (treated as made-to-order, not as units on a shelf)'
    );
    expect(rows.some(row => row[1] === 'Custom' && row[2] === 999)).toBe(true);
  });

  it('says nothing has ever come in, rather than printing a bare zero for enquiries', () => {
    expect(text).toContain('Nothing has ever come in through the contact or academy forms.');
  });

  it('explains the paise reading beside the payment figures', () => {
    expect(text).toContain('The gateway stores paise');
    expect(rows.find(row => row[0] === 'Total (₹)')?.[1]).toBe(48000);
  });

  it('uses the portal’s own category words, not the enum members', () => {
    const catalogue = firstCells.indexOf('Catalogue mix');
    const after = rows.slice(catalogue).map(row => String(row[0]));
    expect(after).toContain('Kurta Pant');
    expect(after).toContain('Indo-Western');
    expect(after).not.toContain('KURTA_PANT');
  });

  it('quotes the fields that need it once the whole document is rendered', () => {
    const report = sampleReport();
    report.topProducts = [
      {
        productId: 'p1',
        name: 'The "Benares" Saree, red',
        category: 'SAREE',
        units: 2,
        revenue: 12000,
      },
    ];
    expect(reportCsvText(report)).toContain('"The ""Benares"" Saree, red",Sarees,2,12000');
  });
});
