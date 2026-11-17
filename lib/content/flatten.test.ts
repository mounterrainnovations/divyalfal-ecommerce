import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { flattenLeaves, numericLeaves, stringLeaves } from './flatten';
import { siteCopy } from './site-copy';

const STRING_LEAVES = 370; // asserted independently by site-copy.test.ts
// Four best-seller prices, four fresh-arrival prices, five testimonial ratings.
const NUMERIC_LEAVES = 13;

describe('flattenLeaves', () => {
  const all = flattenLeaves(siteCopy);

  it('uses exactly the keys the committed site-copy snapshot holds for its string leaves', () => {
    const snap = readFileSync(path.join(__dirname, '__snapshots__/site-copy.test.ts.snap'), 'utf8');
    const snapshotKeys = [...snap.matchAll(/^ {2}"([^"]+)": /gm)].map(m => m[1]);
    expect(snapshotKeys).toHaveLength(STRING_LEAVES);
    expect(Object.keys(stringLeaves(all)).sort()).toEqual([...snapshotKeys].sort());
  });

  it('also keeps the numeric leaves the snapshot cannot see: prices and ratings, nothing else', () => {
    const numeric = Object.keys(numericLeaves(all));
    expect(numeric).toHaveLength(NUMERIC_LEAVES);
    expect(numeric.every(k => /\.(price|rating)$/.test(k))).toBe(true);
    expect(Object.keys(all)).toHaveLength(STRING_LEAVES + NUMERIC_LEAVES);
  });

  it('writes keys as page.section.field and field[i].leaf', () => {
    expect(flattenLeaves({ a: { b: ['x', { c: 2 }] }, d: 'e' })).toEqual({
      'a.b[0]': 'x',
      'a.b[1].c': 2,
      d: 'e',
    });
  });

  it('refuses a leaf that is neither string nor number, rather than dropping its content', () => {
    expect(() => flattenLeaves({ a: { b: true } })).toThrow(/a\.b/);
    expect(() => flattenLeaves({ a: [null] })).toThrow(/a\[0\]/);
    expect(() => flattenLeaves({ a: NaN })).toThrow(/"a"/);
    expect(() => flattenLeaves({ a: undefined })).toThrow(/"a"/);
  });
});
