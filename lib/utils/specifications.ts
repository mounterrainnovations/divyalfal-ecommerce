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
