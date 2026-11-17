/**
 * Product specifications arrive as HTML from the admin's rich-text editor
 * (`<p><strong>Great</strong></p><p></p><p>testing</p>`). The page never injects that HTML:
 * it is read once into plain text blocks here, and React renders them as text nodes, which
 * escape everything. Nothing needs sanitising because nothing is left that could execute.
 *
 * What is kept: the words, entities decoded, in document order. A paragraph that is entirely
 * bold, or a heading, is a *term*; the paragraphs and list items beneath it are its *details*,
 * which is how an editor naturally writes a specification ("Fabric" then "Pure silk"). Anything
 * else is plain text. What is dropped on purpose: links, inline bold/italic inside a sentence,
 * images, and every attribute. The editor's empty paragraphs are spacing, not content.
 */
export type SpecBlock =
  | { type: 'group'; term: string; details: string[] }
  | { type: 'text'; text: string };

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  ndash: '–',
  mdash: '—',
  hellip: '…',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

const BLOCK_TAG = /^(p|li|ul|ol|div|blockquote|br|tr|td|th|table|section|article|hr|h[1-6])$/i;
const HEADING_TAG = /^h[1-6]$/i;
const BOLD_TAG = /^(strong|b)$/i;

interface Line {
  text: string;
  /** A heading, or a line whose every word sat inside a bold element. */
  term: boolean;
}

function toLines(html: string): Line[] {
  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    // An unclosed script or style swallows the rest of the document, as a browser would.
    .replace(/<(script|style)\b[\s\S]*$/i, '');

  const lines: Line[] = [];
  let text = '';
  let boldDepth = 0;
  let unbolded = false;
  let heading = false;

  const flush = () => {
    const collapsed = text.replace(/\s+/g, ' ').trim();
    if (collapsed) lines.push({ text: collapsed, term: heading || !unbolded });
    text = '';
    unbolded = false;
  };

  // Splitting on tags first means an encoded `&lt;b&gt;` stays text: entities are decoded
  // only after the markup has been separated from the words.
  for (const part of cleaned.split(/(<[^>]*>)/)) {
    const tag = /^<(\/?)([a-z][a-z0-9]*)/i.exec(part);
    if (tag) {
      const closing = tag[1] === '/';
      const name = tag[2];
      if (BLOCK_TAG.test(name)) {
        flush();
        if (HEADING_TAG.test(name)) heading = !closing;
      } else if (BOLD_TAG.test(name)) {
        boldDepth = Math.max(0, boldDepth + (closing ? -1 : 1));
      }
      continue;
    }
    if (part === '') continue;
    const decoded = decodeEntities(part);
    if (boldDepth === 0 && decoded.trim() !== '') unbolded = true;
    text += decoded;
  }
  flush();
  return lines;
}

export function parseSpecifications(html: string | null | undefined): SpecBlock[] {
  if (!html) return [];

  const blocks: SpecBlock[] = [];
  let open: { term: string; details: string[] } | null = null;

  const close = () => {
    if (!open) return;
    // A term with nothing under it is just a line of text; a lone <dt> would be invalid.
    blocks.push(
      open.details.length > 0
        ? { type: 'group', term: open.term, details: open.details }
        : { type: 'text', text: open.term }
    );
    open = null;
  };

  for (const line of toLines(html)) {
    if (line.term) {
      close();
      open = { term: line.text, details: [] };
    } else if (open) {
      open.details.push(line.text);
    } else {
      blocks.push({ type: 'text', text: line.text });
    }
  }
  close();
  return blocks;
}

/**
 * One parsed block as one sentence of prose.
 *
 * A group reads `Term: detail. detail` — **all** of its details, not only the first, because
 * a meta description that drops the rest of a specification is a description of nothing. A
 * plain block reads as itself.
 *
 * A group with no details reads as the bare term, with no dangling colon. `parseSpecifications`
 * cannot produce one — a term with nothing under it comes back as a text block, and a test
 * pins that — so this branch is defensive rather than live; it is here so the shape of a
 * `SpecBlock` alone determines the output, without depending on an invariant held elsewhere.
 */
export function specBlockToSentence(block: SpecBlock): string {
  if (block.type !== 'group') return block.text;
  return block.details.length > 0 ? `${block.term}: ${block.details.join('. ')}` : block.term;
}

/**
 * The same stored field as a plain-text meta description.
 *
 * `app/product/[id]/page.tsx` used to put `product.specifications` into the description
 * verbatim, so a search result and every share card carried `<p><strong>…</strong></p>`.
 * The blocks are already parsed to text above, so the description is built from them by
 * `specBlockToSentence`, and the blocks are joined with `. ` so the line scans as sentences
 * rather than a run-on.
 *
 * Truncation cuts on a word boundary and marks the cut with an ellipsis, counted inside
 * `maxLength` so the result never exceeds it. Returns `''` when there is nothing to say, so
 * the caller can fall back to its own sentence rather than emit an empty description.
 */
export function specificationsToDescription(
  html: string | null | undefined,
  maxLength = 160
): string {
  const parts = parseSpecifications(html).map(specBlockToSentence);

  const text = parts
    .join('. ')
    .replace(/\s+/g, ' ')
    .trim()
    // A block that already ended in punctuation would otherwise read "silk.. Lightweight".
    .replace(/([.!?:;,])\.\s/g, '$1 ');

  if (text.length <= maxLength) return text;

  const head = text.slice(0, Math.max(0, maxLength - 1));
  const lastSpace = head.lastIndexOf(' ');
  return `${(lastSpace > 0 ? head.slice(0, lastSpace) : head).replace(/[\s.,;:]+$/, '')}…`;
}
