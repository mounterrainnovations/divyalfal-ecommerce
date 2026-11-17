import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * The standing guard against the pre-revamp visual vocabulary.
 *
 * Twelve tasks replaced pills, gradients, drop shadows, flat greys and a runtime font
 * fetch with the token system in `app/globals.css`. Nothing stops them coming back the
 * next time someone reaches for a familiar Tailwind class, so they are banned here and
 * the gate is a test rather than a review habit.
 *
 * SCOPE — every exclusion below cost a commit to learn, so read before widening it:
 *
 *   - Comments are stripped before matching. Two earlier commits were spent rewording
 *     explanations that merely *named* a banned utility ("the pre-revamp hero floated
 *     its photograph inside a `p-6 … rounded-md` card"). Prose about a mistake is not
 *     the mistake.
 *   - `*.test.ts` and `*.test.tsx` are excluded. Several of them build the banned
 *     shapes out of fragments on purpose (`['bg', 'gradient'].join('-')` in
 *     `components/layout/navbar.test.tsx`) and `lib/content/site-copy.test.ts` carries
 *     retired placeholder strings inside `not.toContain` assertions. A guard that fails
 *     on the tests guarding the same thing is noise.
 *   - `app/dashboard/**` is excluded: the admin surface is untouched Phase 1 work and
 *     the Phase 2 plan (Task 9) owns its restyle. Deleting its gradients now would be a
 *     redesign nobody reviewed.
 *   - `components/ui/button.tsx` and `components/ui/rich-text-editor.tsx` are excluded
 *     for the same reason: both are imported only by `app/dashboard/dashboard-client.tsx`
 *     (grep it), carry `shadow-xs` / `bg-gray-*`, and are deleted or restyled in Phase 2.
 *     `components/ui/sort-dropdown.tsx` IS storefront and IS scanned.
 *   - `.superpowers/` is not under `app/`, `components/` or `lib/`, so briefs and reports
 *     that quote banned utilities are out of scope by construction.
 *
 * EXACTLY ONE SHADOW IS ALLOWED anywhere: the condensed navbar header's
 * `shadow-[0_1px_16px_rgba(20,18,16,0.08)]`. The design grants that one and no other.
 */

const ROOT = path.resolve(__dirname, '..');

/** The source trees the storefront lives in. Everything outside them is out of scope. */
const ROOTS = ['app', 'components', 'lib'];

const EXCLUDED_DIRS = ['app/dashboard/'];

const EXCLUDED_FILES = ['components/ui/button.tsx', 'components/ui/rich-text-editor.tsx'];

/** The single shadow the design system grants, on the condensed navbar header. */
const ALLOWED_SHADOW = 'shadow-[0_1px_16px_rgba(20,18,16,0.08)]';

/**
 * Walked by hand rather than with `fs.globSync`: that exists on this Node but is not in the
 * project's `@types/node`, so it fails `tsc --noEmit`, which is part of the same gate.
 */
function storefrontFiles(): string[] {
  const found: string[] = [];

  const walk = (rel: string) => {
    for (const entry of readdirSync(path.join(ROOT, rel), { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        walk(child);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name)) continue;
      if (child.endsWith('.test.ts') || child.endsWith('.test.tsx')) continue;
      if (EXCLUDED_DIRS.some(dir => child.startsWith(dir))) continue;
      if (EXCLUDED_FILES.includes(child)) continue;
      found.push(child);
    }
  };

  for (const root of ROOTS) walk(root);
  return found.sort();
}

/**
 * Remove `//` line comments, `/* *\/` block comments and the `{/* *\/}` JSX form, keeping
 * every newline so reported line numbers still point at the real line. String and template
 * literals are tracked so that a `https://` inside one is not mistaken for a comment.
 */
export function stripComments(source: string): string {
  type State = 'code' | 'line' | 'block' | 'single' | 'double' | 'template';
  let state: State = 'code';
  let out = '';
  let i = 0;

  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];

    if (state === 'code') {
      if (c === '/' && next === '/') {
        state = 'line';
        i += 2;
        continue;
      }
      if (c === '/' && next === '*') {
        state = 'block';
        i += 2;
        continue;
      }
      if (c === "'") state = 'single';
      else if (c === '"') state = 'double';
      else if (c === '`') state = 'template';
      out += c;
      i += 1;
      continue;
    }

    if (state === 'line') {
      if (c === '\n') {
        state = 'code';
        out += c;
      }
      i += 1;
      continue;
    }

    if (state === 'block') {
      if (c === '*' && next === '/') {
        state = 'code';
        i += 2;
        continue;
      }
      if (c === '\n') out += c;
      i += 1;
      continue;
    }

    // Inside a string or template literal.
    if (c === '\\') {
      out += c + (next ?? '');
      i += 2;
      continue;
    }
    if (
      (state === 'single' && c === "'") ||
      (state === 'double' && c === '"') ||
      (state === 'template' && c === '`')
    ) {
      state = 'code';
    }
    out += c;
    i += 1;
  }

  return out;
}

interface Rule {
  label: string;
  pattern: RegExp;
  /** A match this rule tolerates, with the reason it is tolerated. */
  allow?: (match: string) => boolean;
}

const RULES: Rule[] = [
  { label: 'pill radius', pattern: /\brounded-full\b/g },
  { label: 'oversized radius', pattern: /\brounded-3xl\b/g },
  // `bg-gradient` specifically, not the bare word "gradient": the prose and the tests talk
  // about gradients, and `conic-gradient` in a CSS value is not a Tailwind utility.
  { label: 'gradient background', pattern: /\bbg-gradient(?:-to-[trbl]{1,2})?\b/g },
  { label: 'gradient background (v4 name)', pattern: /\bbg-(?:linear|radial|conic)-[a-z0-9-]+\b/g },
  {
    label: 'gradient colour stop',
    pattern: /\b(?:from|via|to)-(?:rose|pink|purple|fuchsia|violet|indigo|amber|orange)-\d{2,3}\b/g,
  },
  { label: 'grey-scale text', pattern: /\btext-gray-\d{2,3}\b/g },
  { label: 'grey-scale background', pattern: /\bbg-gray-\d{2,3}\b/g },
  { label: 'grey-scale border', pattern: /\bborder-gray-\d{2,3}\b/g },
  {
    label: 'shadow',
    // `(?![\w-])` rather than a trailing `\b`: an arbitrary-value utility ends in `]`, and
    // `\b` cannot hold after a non-word character, so `\b` would backtrack to the bare
    // `shadow` and the one allowed value could never be recognised.
    pattern: /\b(?:drop-)?shadow(?:-(?:2xs|xs|sm|md|lg|xl|2xl|none|inner|\[[^\]]*\]))?(?![\w-])/g,
    allow: match => match === ALLOWED_SHADOW,
  },
  // The slash-opacity form on a text utility shipped a real WCAG failure on this branch
  // (`text-ink-soft/70` against paper). Opacity never goes on type; pick the token that
  // already has the contrast. This also catches the `text-<size>/<leading>` shorthand,
  // which the system replaces with an explicit `leading-*`.
  { label: 'opacity or leading slash on a text utility', pattern: /\btext-[A-Za-z0-9_-]+\/\d{1,3}\b/g },
];

interface Offender {
  where: string;
  rule: string;
  match: string;
}

function sweep(): Offender[] {
  const offenders: Offender[] = [];

  for (const rel of storefrontFiles()) {
    const source = stripComments(readFileSync(path.join(ROOT, rel), 'utf8'));
    const lines = source.split('\n');

    for (const rule of RULES) {
      lines.forEach((line, index) => {
        for (const found of line.matchAll(rule.pattern)) {
          const match = found[0];
          if (rule.allow?.(match)) continue;
          offenders.push({ where: `${rel}:${index + 1}`, rule: rule.label, match });
        }
      });
    }
  }

  return offenders;
}

describe('the banned visual vocabulary cannot return', () => {
  it('scans the storefront and nothing else', () => {
    const files = storefrontFiles();
    expect(files.length).toBeGreaterThan(30);
    expect(files.some(f => f.startsWith('app/dashboard/'))).toBe(false);
    expect(files.some(f => f.endsWith('.test.ts') || f.endsWith('.test.tsx'))).toBe(false);
    expect(files).not.toContain('components/ui/button.tsx');
    expect(files).not.toContain('components/ui/rich-text-editor.tsx');
    // The storefront files the dashboard exclusions must not take with them.
    expect(files).toContain('components/ui/sort-dropdown.tsx');
    expect(files).toContain('app/not-found.tsx');
    expect(files).toContain('app/product/[id]/not-found.tsx');
    expect(files).toContain('components/layout/navbar.tsx');
  });

  it('uses no pills, gradients, shadows, grey-scale utilities or text-opacity slashes', () => {
    expect(sweep()).toEqual([]);
  });

  it('imports no runtime font loader', () => {
    const loaders = storefrontFiles().filter(rel =>
      readFileSync(path.join(ROOT, rel), 'utf8').includes('next/font/google')
    );
    expect(loaders).toEqual([]);
  });

  it('allows the condensed navbar shadow, and only in the navbar', () => {
    const carriers = storefrontFiles().filter(rel =>
      stripComments(readFileSync(path.join(ROOT, rel), 'utf8')).includes(ALLOWED_SHADOW)
    );
    expect(carriers).toEqual(['components/layout/navbar.tsx']);
  });
});

describe('the guard itself', () => {
  it('ignores a banned utility named inside a comment', () => {
    const stripped = stripComments(
      ['/* the old hero used rounded-md and shadow-lg */', 'const a = 1; // bg-gray-100', 'const b = 2;'].join('\n')
    );
    expect(stripped).not.toContain('shadow-lg');
    expect(stripped).not.toContain('bg-gray-100');
    // Line count preserved, so reported line numbers stay truthful.
    expect(stripped.split('\n')).toHaveLength(3);
    expect(stripped.split('\n')[2]).toContain('const b = 2;');
  });

  it('does not mistake a URL inside a string for a comment', () => {
    expect(stripComments("const u = 'https://wa.me/123'; // gone")).toBe("const u = 'https://wa.me/123'; ");
    expect(stripComments('const t = `https://example.com/a`;')).toBe('const t = `https://example.com/a`;');
  });

  it('would catch each banned shape if it came back', () => {
    const samples = [
      'rounded-full',
      'rounded-3xl',
      'bg-gradient-to-br',
      'bg-linear-to-r',
      'from-amber-600',
      'via-pink-200',
      'text-gray-900',
      'bg-gray-50',
      'border-gray-300',
      'shadow-lg',
      'drop-shadow-xl',
      'shadow-[0_2px_4px_rgba(0,0,0,0.2)]',
      'text-ink-soft/70',
      'text-sm/6',
    ];
    for (const sample of samples) {
      const hit = RULES.some(rule => {
        const matches = [...sample.matchAll(rule.pattern)];
        return matches.some(m => !rule.allow?.(m[0]));
      });
      expect(hit, `${sample} should be banned`).toBe(true);
    }
  });

  it('leaves the token system and the one allowed shadow alone', () => {
    const samples = [
      'bg-paper',
      'bg-paper-deep',
      'text-ink',
      'text-ink-soft',
      'text-gold',
      'border-gold',
      'text-sale',
      'bg-ink/35',
      'font-display',
      'font-ui',
      'text-display-1',
      'text-body',
      'text-caption',
      'text-eyebrow',
      'grid-editorial',
      'section-rhythm',
      'rounded-none',
      ALLOWED_SHADOW,
    ];
    for (const sample of samples) {
      const hit = RULES.some(rule => {
        const matches = [...sample.matchAll(rule.pattern)];
        return matches.some(m => !rule.allow?.(m[0]));
      });
      expect(hit, `${sample} should be allowed`).toBe(false);
    }
  });
});

/**
 * The legacy shadcn token block in `app/globals.css` (`--color-muted`, `--color-card`,
 * `--radius-*`, the Geist/Poppins font variables, the `.dark` palette) is NOT deleted in
 * this task, and Task 2 deferred that deletion here on the condition that nothing
 * references it. `app/dashboard/**`, `components/ui/button.tsx` and
 * `components/ui/rich-text-editor.tsx` still do, and Phase 2 Task 9 owns the dashboard
 * restyle, so the block stays and its deprecation comment now names that task.
 *
 * What this guard holds is the condition that makes the block safe to delete later: the
 * storefront must stay clean of it. If this fails, a storefront file has picked up a
 * shadcn token and the Phase 2 deletion would silently restyle it.
 */
const LEGACY_TOKEN_UTILITY =
  /\b(?:bg|text|border|ring|outline|fill|stroke|divide|from|via|to|placeholder|caret|accent|decoration|shadow)-(?:background|foreground|card|card-foreground|popover|popover-foreground|primary|primary-foreground|secondary|secondary-foreground|muted|muted-foreground|accent|accent-foreground|destructive|destructive-foreground|input|sidebar|sidebar-foreground|sidebar-primary|sidebar-accent|sidebar-border|sidebar-ring|chart-[1-5])\b|\bfont-(?:sans|mono|serif|poppins)\b|\brounded-(?:sm|md|lg|xl)\b/g;

describe('the legacy shadcn token block', () => {
  it('is referenced by no storefront file, so Phase 2 Task 9 can delete it', () => {
    const offenders: string[] = [];
    for (const rel of storefrontFiles()) {
      const source = stripComments(readFileSync(path.join(ROOT, rel), 'utf8'));
      source.split('\n').forEach((line, index) => {
        for (const found of line.matchAll(LEGACY_TOKEN_UTILITY)) {
          offenders.push(`${rel}:${index + 1} ${found[0]}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it('is still in globals.css, with its removal pinned to Phase 2 Task 9', () => {
    const css = readFileSync(path.join(ROOT, 'app/globals.css'), 'utf8');
    expect(css).toContain('--color-muted: var(--muted)');
    expect(css).toMatch(/DEPRECATED[^\n]*legacy shadcn token/);
    expect(css).toContain('Phase 2 Task 9');
  });

  it('no longer carries the orphaned .product-description rules', () => {
    const css = readFileSync(path.join(ROOT, 'app/globals.css'), 'utf8');
    expect(css).not.toContain('.product-description');
  });
});

/**
 * `.scrollbar-hide` is live storefront CSS and must not sit inside the block Phase 2 deletes.
 *
 * It used to be written after the `@layer base` reset, in the legacy tail — and the
 * deprecation comment above that tail named only `app/dashboard/**`,
 * `components/ui/button.tsx` and `components/ui/rich-text-editor.tsx` as the remaining
 * consumers. `components/features/products/product-hero.tsx` is a storefront file and depends
 * on this rule for the thumbnail rail it scrolls horizontally on a phone, so Phase 2 Task 9's
 * deletion of "that block" would have revealed a scrollbar on `/product/[id]` with nothing
 * to catch it.
 *
 * So the rule lives in the design system's own utility region, above the deprecation marker,
 * and this test holds it there by position: the definition must come before the DEPRECATED
 * comment, and the deprecated region must declare where it ends.
 */
describe('.scrollbar-hide', () => {
  const css = readFileSync(path.join(ROOT, 'app/globals.css'), 'utf8');

  it('is defined in the live token layer, above the deprecated block', () => {
    const definition = css.indexOf('.scrollbar-hide');
    const deprecation = css.search(/DEPRECATED[^\n]*legacy shadcn token/);
    expect(definition).toBeGreaterThan(-1);
    expect(deprecation).toBeGreaterThan(-1);
    expect(definition).toBeLessThan(deprecation);
    // Both halves of the rule moved, not just the first.
    expect(css).toContain('.scrollbar-hide::-webkit-scrollbar');
    expect(css.indexOf('.scrollbar-hide::-webkit-scrollbar')).toBeLessThan(deprecation);
  });

  it('is still the class the product hero asks for', () => {
    const hero = readFileSync(
      path.join(ROOT, 'components/features/products/product-hero.tsx'),
      'utf8'
    );
    expect(stripComments(hero)).toContain('scrollbar-hide');
  });

  /**
   * **`lastIndexOf`, and then `stripComments`.** This assertion guarded 603 characters for
   * three commits and nobody noticed, because the phrase `END OF THE DEPRECATED BLOCK`
   * occurs **twice**: once in the deprecation comment's own WHAT TO DELETE paragraph
   * (`app/globals.css:285`, naming the marker it points at) and once as the real marker
   * (`:415`). `indexOf` found the self-reference, so the slice stopped seven lines in, inside
   * the comment, and `.scrollbar-hide` was absent from it for the wrong reason — the rule
   * could have moved back below `@layer base` and this test would still have passed.
   *
   * `lastIndexOf` alone does not fix it either: it takes the real marker, the region grows to
   * ~5,950 characters, and it now contains the comment prose that *names* `.scrollbar-hide`
   * while explaining why it was moved out. So the region is stripped of comments first — the
   * same `stripComments` the whole file's sweep uses, for the same reason: prose about a rule
   * is not the rule.
   *
   * One detail that bit on the way: **`stripComments` reads its argument from the `code`
   * state**, so a slice that *begins* inside a comment is parsed as code and the comment's
   * prose survives it. Slicing from the `DEPRECATED` word therefore still leaked the
   * `.scrollbar-hide` mention. So the region begins where that comment *ends* — which is also
   * the right boundary on its own terms: the deprecation note is not part of what gets
   * deleted, the CSS after it is.
   *
   * The length assertion is the part that cannot rot: it fails if the region ever collapses
   * back to a few hundred characters, whatever the reason.
   */
  it('leaves the deprecated region with an explicit end, so a deletion cannot overrun it', () => {
    const marker = css.search(/DEPRECATED[^\n]*legacy shadcn token/);
    const end = css.lastIndexOf('END OF THE DEPRECATED BLOCK');
    expect(marker).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(marker);
    // The phrase appears twice; this must be the later one, not the self-reference inside the
    // deprecation note's own WHAT TO DELETE paragraph.
    expect(css.indexOf('END OF THE DEPRECATED BLOCK')).toBeLessThan(end);

    // The CSS between the two markers: from the end of the deprecation comment to the start
    // of the end marker's. Comments inside it are then stripped, so prose about a rule is not
    // read as the rule.
    const start = css.indexOf('*/', marker) + 2;
    expect(start).toBeGreaterThan(marker);
    expect(end - start).toBeGreaterThan(4000); // the real region; `indexOf` gave 603

    const deprecated = stripComments(css.slice(start, end));
    expect(deprecated).not.toContain('.scrollbar-hide');
    // ...and the region really is the legacy block, so this cannot pass on an empty slice.
    expect(deprecated).toContain('--color-muted');
    expect(deprecated).toContain('@layer base');
  });
});

/**
 * Every surface that renders a `ProductTile` must pass its own `sizes`.
 *
 * `sizes` tells the browser how wide the photograph will be *before* layout, so it can pick a
 * file. It describes a layout, and the four surfaces that render this tile lay it out four
 * different ways — the listings one-up then two-up, the related strip one-up then three-up,
 * and the two home bands drifting across the grid at five and six columns. A single shared
 * hint was right for none of them: measured at the widest point of each band, the home
 * Collection rendered 648px at 1440 while the shared hint asked for 336px, a 1.9x upscale on
 * the homepage's largest editorial moment.
 *
 * `ProductTile`'s fallback is deliberately generous rather than typical, so forgetting to pass
 * one over-fetches instead of shipping a blurred garment — but relying on it is still a bug,
 * and this is the only place that can catch it, since a missing optional prop is not a type
 * error. Measure the new surface at both edges of every band (767 and 768, 1023 and 1024,
 * 1439 and 1440); the widest point of a band is usually its top, not the breakpoint itself.
 */
describe('ProductTile sizes hints', () => {
  it('is passed explicitly by every surface that renders a tile', () => {
    const offenders: string[] = [];
    for (const rel of storefrontFiles()) {
      if (rel === 'components/primitives/ProductTile.tsx') continue;
      const source = stripComments(readFileSync(path.join(ROOT, rel), 'utf8'));
      // Each `<ProductTile` up to its closing bracket, so a multi-line call is one match.
      for (const found of source.matchAll(/<ProductTile\b[\s\S]*?\/?>/g)) {
        if (!/\bsizes=/.test(found[0])) {
          offenders.push(`${rel}: ${found[0].replace(/\s+/g, ' ').slice(0, 80)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('finds the call sites it claims to check, so the guard cannot pass vacuously', () => {
    const callSites = storefrontFiles().filter(
      rel =>
        rel !== 'components/primitives/ProductTile.tsx' &&
        /<ProductTile\b/.test(stripComments(readFileSync(path.join(ROOT, rel), 'utf8')))
    );
    expect(callSites).toEqual([
      'components/features/products/product-listing.tsx',
      'components/features/products/you-may-also-like.tsx',
      'components/sections/collection.tsx',
      'components/sections/shop-by-style.tsx',
    ]);
  });
});

/**
 * The gold focus ring, and the ground it is allowed on.
 *
 * Measured at the Task 13 gate: `--gold` against `--paper` is **3.168 : 1**, which clears
 * WCAG 1.4.11's 3:1 for a non-text indicator by 0.17 — and against `--paper-deep` it is
 * **2.855 : 1**, which does not. Today every `outline-gold` is in `components/layout/navbar.tsx`
 * and every one of them sits on `bg-paper` (the header and the full-screen menu), so the
 * ring passes everywhere it is drawn. That is luck rather than design: nothing stopped a new
 * section on the deeper ground — the footer, the policy contact cards, the gallery band — from
 * inheriting a focus ring that fails.
 *
 * So the invariant is checked rather than assumed, from the tokens themselves, so that
 * lightening `--gold` or darkening `--paper-deep` changes the verdict here rather than
 * silently shipping an indicator nobody can see.
 *
 * The pairing check is file-level, which is coarse: it cannot see that a ring in file A is
 * rendered inside a `bg-paper-deep` section declared in file B. It catches the likely case —
 * a component that draws both — and the token maths above catches the rest by making the
 * constraint impossible to forget.
 */
const hexToRgb = (hex: string): [number, number, number] =>
  [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

const relativeLuminance = ([r, g, b]: [number, number, number]) => {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

const contrast = (a: string, b: string) => {
  const [la, lb] = [relativeLuminance(hexToRgb(a)), relativeLuminance(hexToRgb(b))];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

const cssToken = (css: string, name: string) => {
  const found = new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(css);
  if (!found) throw new Error(`token ${name} not found in globals.css`);
  return found[1];
};

describe('the gold focus ring', () => {
  const css = readFileSync(path.join(ROOT, 'app/globals.css'), 'utf8');
  const gold = cssToken(css, '--gold');
  const paper = cssToken(css, '--paper');
  const paperDeep = cssToken(css, '--paper-deep');

  it('computes the contrasts the gate measured in the browser', () => {
    // Sanity-check the maths against the two values measured against the live page, so a
    // mistake here cannot quietly make the guard below meaningless.
    expect(contrast(gold, paper)).toBeCloseTo(3.168, 2);
    expect(contrast(gold, paperDeep)).toBeCloseTo(2.855, 2);
  });

  it('clears 3:1 against paper, which is the only ground it is drawn on', () => {
    expect(contrast(gold, paper)).toBeGreaterThanOrEqual(3);
  });

  it('is never paired with the deeper paper ground while it fails 3:1 there', () => {
    const carriers = storefrontFiles().filter(rel =>
      stripComments(readFileSync(path.join(ROOT, rel), 'utf8')).includes('outline-gold')
    );
    // If this ever lists a file beyond the navbar, check that file's ground by hand before
    // adding it: the pairing check below only sees grounds declared in the same file.
    expect(carriers).toEqual(['components/layout/navbar.tsx']);

    if (contrast(gold, paperDeep) >= 3) return; // gold was fixed; the hazard is gone.

    const offenders = carriers.filter(rel =>
      stripComments(readFileSync(path.join(ROOT, rel), 'utf8')).includes('bg-paper-deep')
    );
    expect(offenders).toEqual([]);
  });

  it('names the constraint at the token definition, where someone reaching for gold will see it', () => {
    // The comment has to sit immediately above `--gold`, not anywhere in the file: someone
    // changing the token reads the lines just above it and nothing else.
    const definition = css.indexOf('--gold:');
    expect(definition).toBeGreaterThan(-1);
    const precedingComment = css.slice(Math.max(0, definition - 700), definition);
    expect(precedingComment).toContain('paper-deep');
    // Both measured ratios, so the comment cannot drift from the guard above it.
    expect(precedingComment).toContain('3.168');
    expect(precedingComment).toContain('2.855');
    // And the alternative, so the reader is not left with a constraint and no way out.
    expect(precedingComment).toContain('outline-ink');
  });
});
