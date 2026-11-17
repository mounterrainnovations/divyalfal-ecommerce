/**
 * The one flatten for `siteCopy`.
 *
 * Walks the copy to `page.section.field` keys, arrays as `field[0].leaf`. The committed
 * snapshot (`lib/content/__snapshots__`), the rendered-coverage sweep, the Phase 2 seed and
 * the storefront's resolver must all agree on these keys, so they all call this and nothing
 * else: key drift between copies is exactly what the snapshot exists to prevent.
 *
 * Leaves are strings AND numbers. `siteCopy` carries 13 numeric leaves (garment prices and
 * testimonial ratings) that a strings-only walk never sees; the snapshot's 370 is a string
 * count (`stringLeaves`), and the full leaf set is 383. Any other leaf (boolean, null,
 * undefined, NaN) THROWS: silently skipping one would drop content without a trace.
 *
 * Pure data in, plain record out: no imports, so a server or client module can use it.
 */
export type Leaves = Record<string, string | number>;

export function flattenLeaves(node: unknown, prefix = '', out: Leaves = {}): Leaves {
  if (typeof node === 'string' || (typeof node === 'number' && Number.isFinite(node))) {
    out[prefix] = node;
  } else if (Array.isArray(node)) {
    node.forEach((value, index) => flattenLeaves(value, `${prefix}[${index}]`, out));
  } else if (node !== null && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      flattenLeaves(value, prefix ? `${prefix}.${key}` : key, out);
    }
  } else {
    throw new Error(
      `siteCopy leaf "${prefix}" is ${node === null ? 'null' : typeof node}, not a string or number.`
    );
  }
  return out;
}

/** Only the string leaves: what the committed snapshot and its 370-leaf assertion cover. */
export function stringLeaves(leaves: Leaves): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(leaves)) if (typeof value === 'string') out[key] = value;
  return out;
}

/** Only the numeric leaves (prices, ratings). */
export function numericLeaves(leaves: Leaves): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(leaves)) if (typeof value === 'number') out[key] = value;
  return out;
}
