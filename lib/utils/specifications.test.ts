import { describe, expect, it } from 'vitest';
import { parseSpecifications, specificationsToDescription } from './specifications';

// The two live products' `specifications`, as the rich-text editor stored them.
const LIVE_SAREE =
  '<p><strong>Authentic Handcrafted Saree from Madhya Pradesh</strong></p><p>Experience the timeless elegance of Madhya Pradesh.</p><p>Lightweight, comfortable, and versatile.</p><p><strong>Crafted in Madhya Pradesh | Traditional Artistry | Elegant &amp; Timeless</strong></p>';
const LIVE_TEST =
  '<p><strong>Great</strong></p><p></p><p></p><p><em>for</em></p><p></p><p></p><p>testing</p>';

describe('parseSpecifications', () => {
  it('turns a bold lead-in plus the paragraphs under it into one term with its details', () => {
    expect(parseSpecifications(LIVE_TEST)).toEqual([
      { type: 'group', term: 'Great', details: ['for', 'testing'] },
    ]);
  });

  it('keeps a bold line with nothing under it as plain text, not a dangling term', () => {
    expect(parseSpecifications(LIVE_SAREE)).toEqual([
      {
        type: 'group',
        term: 'Authentic Handcrafted Saree from Madhya Pradesh',
        details: [
          'Experience the timeless elegance of Madhya Pradesh.',
          'Lightweight, comfortable, and versatile.',
        ],
      },
      { type: 'text', text: 'Crafted in Madhya Pradesh | Traditional Artistry | Elegant & Timeless' },
    ]);
  });

  it('reads list items as details of the term above them', () => {
    expect(
      parseSpecifications('<p><strong>Fabric</strong></p><ul><li>Silk</li><li>Zari border</li></ul>')
    ).toEqual([{ type: 'group', term: 'Fabric', details: ['Silk', 'Zari border'] }]);
  });

  it('treats headings as terms too', () => {
    expect(parseSpecifications('<h3>Care</h3><p>Dry clean only.</p>')).toEqual([
      { type: 'group', term: 'Care', details: ['Dry clean only.'] },
    ]);
  });

  it('keeps leading prose that has no term above it as plain text', () => {
    expect(parseSpecifications('<p>Intro</p><p><strong>Fabric</strong></p><p>Silk</p>')).toEqual([
      { type: 'text', text: 'Intro' },
      { type: 'group', term: 'Fabric', details: ['Silk'] },
    ]);
  });

  it('does not split a paragraph that only starts with bold text', () => {
    expect(parseSpecifications('<p><strong>Fabric:</strong> pure silk</p>')).toEqual([
      { type: 'text', text: 'Fabric: pure silk' },
    ]);
  });

  it('decodes entities to text and never reinterprets them as markup', () => {
    expect(parseSpecifications('<p>Tea&nbsp;rose &#8377;5 &amp; &lt;b&gt;bold&lt;/b&gt;</p>')).toEqual([
      { type: 'text', text: 'Tea rose ₹5 & <b>bold</b>' },
    ]);
  });

  it('drops script and style bodies entirely', () => {
    const blocks = parseSpecifications(
      '<p>kept</p><script>alert(1)</script><style>p{color:red}</style><img src=x onerror="alert(2)">'
    );
    expect(blocks).toEqual([{ type: 'text', text: 'kept' }]);
    expect(JSON.stringify(blocks)).not.toMatch(/alert|color|onerror/);
  });

  it('treats a break as a paragraph boundary and collapses stray whitespace', () => {
    expect(parseSpecifications('<p>one<br>  two\n three</p>')).toEqual([
      { type: 'text', text: 'one' },
      { type: 'text', text: 'two three' },
    ]);
  });

  it('returns nothing for empty or tag-only input', () => {
    expect(parseSpecifications('')).toEqual([]);
    expect(parseSpecifications('<p></p><p> </p>')).toEqual([]);
  });
});

/**
 * `app/product/[id]/page.tsx` used to hand `product.specifications` straight to the meta
 * description, which put `<p><strong>...</strong></p>` into the `<meta>` tag -- markup in a
 * search result and a share card. The description is built from the parsed text instead.
 */
describe('specificationsToDescription', () => {
  it('carries no markup out of the stored HTML', () => {
    const out = specificationsToDescription(LIVE_SAREE, 300);
    expect(out).not.toMatch(/[<>]/);
    expect(out).toContain('Authentic Handcrafted Saree from Madhya Pradesh');
    expect(out).toContain('Experience the timeless elegance of Madhya Pradesh.');
  });

  it('joins the blocks into one line, terms with their details and the rest as sentences', () => {
    // `LIVE_TEST` parses as one group (`Great` / `for`) plus a trailing plain block.
    expect(specificationsToDescription(LIVE_TEST, 300)).toBe('Great: for. testing');
  });

  it('keeps a term with its details rather than losing either', () => {
    expect(specificationsToDescription('<h2>Fabric</h2><p>Pure silk</p>', 300)).toBe(
      'Fabric: Pure silk'
    );
  });

  it('truncates on a word boundary and marks the cut with an ellipsis', () => {
    const out = specificationsToDescription('<p>' + 'word '.repeat(80) + '</p>', 60);
    expect(out.length).toBeLessThanOrEqual(60);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });

  it('never cuts mid-word', () => {
    expect(specificationsToDescription('<p>alpha bravo charlie delta</p>', 14)).toBe('alpha bravo…');
  });

  it('leaves a description that already fits untouched, with no ellipsis', () => {
    expect(specificationsToDescription('<p>Pure silk</p>', 160)).toBe('Pure silk');
  });

  it('returns an empty string for nothing to describe, so the caller can fall back', () => {
    expect(specificationsToDescription(null, 160)).toBe('');
    expect(specificationsToDescription('', 160)).toBe('');
    expect(specificationsToDescription('<p> </p>', 160)).toBe('');
  });

  it('collapses the whitespace a multi-line stored value carries', () => {
    expect(specificationsToDescription('<p>one</p>\n\n<p>  two  </p>', 160)).toBe('one. two');
  });
});
