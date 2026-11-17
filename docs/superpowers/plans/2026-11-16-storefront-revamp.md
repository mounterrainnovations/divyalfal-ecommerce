# Divyafal Storefront Revamp (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the public Divyafal storefront in the Atelier Editorial design system — twelve homepage sections reduced to seven movements — preserving every existing sentence verbatim and every existing backend contract.

**Architecture:** A token-first design system in `app/globals.css` consumed through Tailwind 4 `@theme`, a small set of editorial primitives in `components/primitives/`, and all existing verbatim copy extracted into one module (`lib/content/site-copy.ts`) that a test guards against loss. Sections are rebuilt against that copy module and the unchanged `/api/products`, `/api/homepage-sections` and `/api/slideshow` contracts. No schema change, no new API, no data writes — Phase 1 is read-only against production.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, Prisma 6.18 (reads only), self-hosted Fraunces + Jost woff2, Vitest + React Testing Library (new, dev-only).

**Spec:** `docs/superpowers/specs/2026-11-16-divyafal-revamp-design.md`

## Global Constraints

- **Every existing sentence of body copy is preserved verbatim.** Headings are structure and may merge or be renamed; where a movement maps 1:1 the existing heading survives (Shop by Style, Virasat Academy, About). Spec §5a.5.
- **Palette, exactly these six values, as CSS custom properties:** `--paper: #FAF7F2`, `--paper-deep: #F1EBE1`, `--ink: #141210`, `--ink-soft: #6B635A`, `--gold: #A8873F`, `--accent-sale: #8C2F2F`. Gold only as 1px rules and small marks, never a fill. No gradients anywhere. No shadows except one soft lift on the sticky nav once scrolled.
- **Type:** Display = Fraunces (variable, OFL), weights 300–400, large sizes only. UI/body = Jost (OFL). Self-hosted woff2 in `public/fonts` via `@font-face`. **No `next/font/google`** — runtime font fetch is forbidden by `documents/codebase-context.md`.
- **Type scale,** desktop → mobile: display 96/72/56 → 44/36/28; body 17 → 16; caption 13; eyebrow 11 at `0.18em` tracking, uppercase. Line height 1.05 display, 1.65 body. Measure capped at 68ch.
- **Layout:** 12-column grid, 1440px max content width, 160px desktop section rhythm (96px mobile), 24px mobile gutters. Content sits at columns 2–7 or 6–12, rarely centred.
- **Motion:** CSS only — image reveal (opacity + 1.04→1 scale, 900ms), text fade-up 24px staggered 60ms, nav condense on scroll. All behind `prefers-reduced-motion`. No animation library, no scroll-jacking, no parallax.
- **No new storefront features:** no cart, checkout, payments, accounts, wishlist, i18n.
- **`app/product/[id]/page.tsx` keeps `dynamic = 'force-dynamic'` and `revalidate = 0`.** Spec §5a.6 — a deliberate Vercel/Prisma production fix recorded in `GEMINI.md`.
- **Placeholder garment fallbacks stay** and render only when the API returns nothing, dimmed and non-clickable, as today. Spec §5a.1.
- **Removed throughout:** pills, `rounded-3xl`, pastel gradients (`rose-100`, `pink-50`, `purple-100`, `amber-100`, `orange-50`).
- **Verification gate per task:** `npm run lint` and `npm test` pass. Final gate: `npm run build`, desktop Lighthouse ≥95 performance/accessibility/best-practices and mobile ≥90 performance / ≥95 accessibility/best-practices on `/`, `/products`, `/product/[id]`, plus a manual pass at 390px, 768px, 1440px.
- **Branch:** `feat/atelier-revamp`. No pushes to `main`.

## Review Focus

Five conditions the spec implies, that a reasonable visitor will hit, and that no feature task would otherwise test. Each is pinned to the task that owns the code.

1. **A product with an empty `photos` array** — `Product.photos` is `String[]` with no minimum, and the admin can save a product with none. `ProductTile` must render a labelled empty frame, never a broken image or a crash. → Task 3.
2. **A product with exactly one photo** — the tile's hover swap reads `photos[1]`. It must stay on `photos[0]` rather than render `undefined`. → Task 3.
3. **`sale: true` with `salePrice: null`** — both columns are independently nullable in the schema. The tile and detail page must fall back to the regular price, never render "₹null" or NaN. → Task 3.
4. **`prefers-reduced-motion: reduce`** — reveal animations start at `opacity: 0`. Under reduced motion content must be immediately visible, not left permanently invisible. → Task 2.
5. **An API that returns `{}`, an error, or an empty array** — `/api/homepage-sections` 500s if `DATABASE_URL` is missing and returns empty arrays at low inventory. Every movement must render its fallback tier or collapse cleanly, never blank the page or throw. → Task 6.

---

### Task 1: Test harness

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`, `test/smoke.test.ts`
- Modify: `package.json` (scripts, devDependencies)

**Interfaces:**
- Consumes: nothing.
- Produces: `npm test` (single run) and `npm run test:watch`. Tests live beside source as `*.test.ts(x)` and under `test/`. `@/` resolves to the repo root, matching `tsconfig.json` paths.

- [ ] **Step 1: Write the failing test**

```ts
// test/smoke.test.ts
import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('test harness', () => {
  it('runs and resolves the @/ alias', () => {
    expect(cn('a', 'b')).toBe('a b');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — no `test` script / vitest not installed.

- [ ] **Step 3: Install and configure**

`npm i -D vitest@3.2.4 @vitejs/plugin-react@5.0.4 jsdom@26.1.0 @testing-library/react@16.3.0 @testing-library/dom@10.4.1 @testing-library/jest-dom@6.9.1 @testing-library/user-event@14.6.1`

`vitest.config.ts`: react plugin, `environment: 'jsdom'`, `setupFiles: ['./vitest.setup.ts']`, `resolve.alias['@']` → repo root, `globals: true`.
`vitest.setup.ts`: `import '@testing-library/jest-dom/vitest'`.
`package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test`
Expected: PASS, 1 test.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts vitest.setup.ts test/smoke.test.ts package.json package-lock.json
git commit -m "test: add vitest + react testing library harness"
```

---

### Task 2: Design tokens, fonts and motion

**Files:**
- Create: `public/fonts/` (Fraunces and Jost woff2), `app/tokens.test.ts`, `components/primitives/Reveal.tsx`, `components/primitives/Reveal.test.tsx`
- Modify: `app/globals.css`, `app/layout.tsx`

**Interfaces:**
- Consumes: Task 1's harness.
- Produces: CSS custom properties `--paper`, `--paper-deep`, `--ink`, `--ink-soft`, `--gold`, `--accent-sale`; Tailwind utilities `bg-paper`, `bg-paper-deep`, `text-ink`, `text-ink-soft`, `text-gold`, `border-gold`, `text-sale`; font families `font-display` (Fraunces) and `font-ui` (Jost); type utilities `text-display-1|2|3`, `text-body`, `text-caption`, `text-eyebrow`; layout utilities `grid-editorial` (12-col, 1440 max), `section-rhythm`; `<Reveal>{children}</Reveal>` wrapping any block in the spec's reveal animation.

- [ ] **Step 1: Write the failing tests**

```ts
// app/tokens.test.ts
import { readFileSync } from 'node:fs';
const css = readFileSync('app/globals.css', 'utf8');

it('declares the six palette tokens with the spec values', () => {
  for (const [token, value] of [
    ['--paper', '#FAF7F2'], ['--paper-deep', '#F1EBE1'], ['--ink', '#141210'],
    ['--ink-soft', '#6B635A'], ['--gold', '#A8873F'], ['--accent-sale', '#8C2F2F'],
  ]) expect(css).toMatch(new RegExp(`${token}:\\s*${value}`, 'i'));
});

it('self-hosts both families and never fetches fonts at runtime', () => {
  expect(css).toMatch(/@font-face/);
  expect(css).toMatch(/Fraunces/);
  expect(css).toMatch(/Jost/);
  expect(css).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
});

it('guards every animation behind prefers-reduced-motion', () => {
  expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
```

```tsx
// components/primitives/Reveal.test.tsx — Review Focus #4
it('renders children visible when reduced motion is preferred', () => {
  window.matchMedia = ((q: string) => ({
    matches: q.includes('prefers-reduced-motion'), media: q,
    addEventListener: () => {}, removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  render(<Reveal><p>Elegance</p></Reveal>);
  const el = screen.getByText('Elegance').parentElement!;
  expect(el).not.toHaveClass('opacity-0');
});

it('renders children even when IntersectionObserver never fires', () => {
  render(<Reveal><p>Distinctive</p></Reveal>);
  expect(screen.getByText('Distinctive')).toBeVisible();
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- tokens Reveal`
Expected: FAIL — tokens absent, `Reveal` not found.

- [ ] **Step 3: Download and commit the fonts**

Fetch the variable woff2 for **Fraunces** (opsz 9–144, wght 300–400) and **Jost** (wght 300–600) from the Google Fonts CSS API once, save under `public/fonts/`, and reference them from `@font-face` with `font-display: swap` and explicit `unicode-range` for latin + latin-ext. Preload the two faces used above the fold in `app/layout.tsx`.

- [ ] **Step 4: Replace the token layer in `app/globals.css`**

Delete the shadcn oklch token block and `tw-animate-css` import. Declare the six palette tokens, the type scale and layout values from Global Constraints as custom properties on `:root`, expose them through `@theme inline` as the utilities named in Interfaces, set `body { background: var(--paper); color: var(--ink); font-family: Jost }`, and define `@keyframes` for image reveal and text fade-up with a `@media (prefers-reduced-motion: reduce)` block that sets every animated element to its final state.

- [ ] **Step 5: Implement `Reveal({ children, delay }: { children: ReactNode; delay?: number }): JSX.Element` in `components/primitives/Reveal.tsx`**

Client component. `IntersectionObserver` adds the reveal class once; initial state is visible and the animation only *starts* hidden when motion is allowed, so a never-firing observer or reduced motion both leave content readable.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- tokens Reveal` → PASS. Then `npm run lint` → clean.

- [ ] **Step 7: Commit**

```bash
git add app/globals.css app/layout.tsx app/tokens.test.ts public/fonts components/primitives/Reveal.tsx components/primitives/Reveal.test.tsx
git commit -m "feat: atelier design tokens, self-hosted fonts, reveal primitive"
```

---

### Task 3: Editorial primitives

**Files:**
- Create: `components/primitives/Eyebrow.tsx`, `DisplayHeading.tsx`, `HairlineRule.tsx`, `Button.tsx`, `EditorialPair.tsx`, `ProductTile.tsx`, and `ProductTile.test.tsx`, `Button.test.tsx`, `price.test.ts`
- Create: `lib/utils/price.ts`
- Modify: `components/ui/button.tsx` (re-export the new `Button` so existing imports keep working)

**Interfaces:**
- Consumes: Task 2's tokens and `Reveal`.
- Produces:
  - `Eyebrow({ children }: { children: ReactNode })` — uppercase 11px, `0.18em` tracking.
  - `DisplayHeading({ children, level, size }: { children: ReactNode; level?: 1|2|3; size?: 1|2|3 })` — Fraunces, light.
  - `HairlineRule({ className }: { className?: string })` — 1px gold.
  - `Button({ href, onClick, children, variant }: { href?: string; onClick?: () => void; children: ReactNode; variant?: 'primary'|'quiet' })` — text + rule, never a pill; renders `<a>` when `href` is set, else `<button>`.
  - `EditorialPair({ media, children, flip }: { media: ReactNode; children: ReactNode; flip?: boolean })` — asymmetric image/text pair.
  - `Marquee({ children }: { children: ReactNode })` — CSS-only horizontal drift, used for one brand line and nowhere else; pauses under `prefers-reduced-motion`.
  - `ProductTile({ product, priority }: { product: Product; priority?: boolean })` — portrait 3:4, hover swaps to `photos[1]`, links to `/product/[id]`.
  - `formatPrice(value: number): string` and `resolvePrice(product: Product): { display: string; compareAt: string | null; onSale: boolean }` in `lib/utils/price.ts`.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/utils/price.test.ts — Review Focus #3
it('formats rupees with Indian grouping and no decimals', () => {
  expect(formatPrice(10999)).toBe('₹10,999');
  expect(formatPrice(1250000)).toBe('₹12,50,000');
});

it('falls back to the regular price when sale is true but salePrice is null', () => {
  const r = resolvePrice({ ...base, sale: true, salePrice: null });
  expect(r.display).toBe('₹8,000');
  expect(r.compareAt).toBeNull();
  expect(r.onSale).toBe(false);
});

it('shows the sale price with the original struck through when both are present', () => {
  const r = resolvePrice({ ...base, sale: true, salePrice: 6000 });
  expect(r).toMatchObject({ display: '₹6,000', compareAt: '₹8,000', onSale: true });
});
```

```tsx
// components/primitives/ProductTile.test.tsx — Review Focus #1, #2
it('renders a labelled empty frame when the product has no photos', () => {
  render(<ProductTile product={{ ...base, photos: [] }} />);
  expect(screen.queryByRole('img')).toBeNull();
  expect(screen.getByText(/image coming soon/i)).toBeInTheDocument();
});

it('keeps the first photo on hover when only one exists', async () => {
  render(<ProductTile product={{ ...base, photos: ['/a.jpg'] }} />);
  await userEvent.hover(screen.getByRole('link'));
  expect(screen.getAllByRole('img')).toHaveLength(1);
  expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('a.jpg'));
});

it('links to the product detail page and exposes an accessible name', () => {
  render(<ProductTile product={base} />);
  expect(screen.getByRole('link', { name: /Red Velvet Saree/i })).toHaveAttribute('href', `/product/${base.id}`);
});
```

```tsx
// components/primitives/Button.test.tsx
it('renders an anchor for href and a button for onClick, and is never a pill', () => { /* asserts no rounded-full class */ });
it('keeps a visible focus ring when focused by keyboard', () => { /* asserts focus-visible class present */ });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- price ProductTile Button`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the primitives and `lib/utils/price.ts`**

`formatPrice` uses `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })`. `resolvePrice` treats sale as active only when `sale === true && salePrice != null && salePrice < price`. Tiles use `next/image` with `sizes` matching the editorial grid; the hover swap is CSS opacity between two stacked images and is only rendered when `photos.length > 1`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- price ProductTile Button` → PASS.

- [ ] **Step 5: Commit**

```bash
git add components/primitives lib/utils/price.ts components/ui/button.tsx
git commit -m "feat: editorial primitives and price resolution"
```

---

### Task 4: Verbatim copy module

**Files:**
- Create: `lib/content/site-copy.ts`, `lib/content/site-copy.test.ts`
- Read for extraction: `components/sections/*.tsx`, `components/layout/footer.tsx`, `app/*/page.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `siteCopy`, a deeply-readonly object keyed `page.section.field` (`siteCopy.home.about.body`, `siteCopy.home.values.items[]`, `siteCopy.home.testimonials[]`, `siteCopy.home.collection[]`, `siteCopy.footer.contact.phone`, …). Phase 2's seed script reads the same keys, so key names are an interface, not an implementation detail.

- [ ] **Step 1: Write the failing test**

The test is the contract that "every word verbatim" cannot regress. It asserts the exact current strings, copied character-for-character out of the existing components, including typographic apostrophes.

```ts
// lib/content/site-copy.test.ts
it('preserves the About paragraph verbatim', () => {
  expect(siteCopy.home.about.body).toContain(
    'In 2010, our founder embarked on an extraordinary journey with nothing but a dream and 16 carefully curated sarees.'
  );
  expect(siteCopy.home.about.body).toContain('most spectacular yet, featuring cutting-edge designs, world-class models');
});

it('preserves both About statistics', () => {
  expect(siteCopy.home.about.stats).toEqual([
    { value: '15', label: 'Years of Excellence' },
    { value: '5000+', label: 'Happy Clients' },
  ]);
});

it('preserves all five testimonials verbatim and unattributed', () => {
  expect(siteCopy.home.testimonials).toHaveLength(5);
  expect(siteCopy.home.testimonials[0].quote).toBe(
    'Wearing Divyafal by Alpa Rawat was an experience not just a dress, but a story. I felt truly unique and ethereal in my lehenga.'
  );
  expect(siteCopy.home.testimonials.every(t => !('name' in t) || t.name === '')).toBe(true);
});

it('preserves all six value statements', () => {
  expect(siteCopy.home.values.items).toHaveLength(6);
  expect(siteCopy.home.values.items.map(v => v.body)).toContain(
    'We pursue perfection in every stitch, every design, and every customer interaction.'
  );
});

it('preserves the three named collection entries and the fourth fallback', () => {
  expect(siteCopy.home.collection.map(c => c.title)).toEqual(
    expect.arrayContaining(['Haldi & Kumkum Dress', 'The Rajwadi Brocade', 'Neelam Frill Lehenga', 'The Royal Cascade Lehenga'])
  );
});

it('spells the founder Alpa Rawat everywhere', () => {
  expect(JSON.stringify(siteCopy)).not.toContain('Alpa Rawal');
});

it('carries the real contact details, not the footer placeholders', () => {
  expect(siteCopy.footer.contact.phone).toBe('+919977057045');
  expect(siteCopy.footer.contact.email).toBe('divyafalthecreations@gmail.com');
  expect(JSON.stringify(siteCopy)).not.toContain('9876543210');
  expect(JSON.stringify(siteCopy)).not.toContain('hello@divyafal.com');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- site-copy`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/content/site-copy.ts`**

Transcribe every visible string from the existing components by copy-paste, never retyping, so apostrophes and spacing survive. Apply the two §5a.4 bug fixes only: real phone and email, and `Alpa Rawat` throughout. Type it `as const` and export `type SiteCopy = typeof siteCopy`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- site-copy` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/content/site-copy.ts lib/content/site-copy.test.ts
git commit -m "feat: extract verbatim site copy with preservation tests"
```

---

### Task 5: Movements 1–2 — Hero and Categories

**Files:**
- Rewrite: `components/layout/hero.tsx`, `components/sections/categories.tsx`
- Create: `components/sections/categories.test.tsx`, `components/layout/hero.test.tsx`
- Modify: `app/page.tsx` (compose movements as they land)

**Interfaces:**
- Consumes: Tasks 2–4.
- Produces: `<Hero />` (100vh full-bleed, desktop image + mobile `webm` preserved, brand line and est. mark overlaid), `<Categories />` (type list with hairline rules, no avatar circles).

- [ ] **Step 1: Write the failing tests**

```tsx
// hero.test.tsx
it('renders the brand line and est. mark over the media', () => { /* siteCopy.home.hero.brandLine, 'EST. 2010' */ });
it('keeps the mobile video source and marks it decorative', () => {
  // asserts the Supabase bg_video.webm src survives and carries muted/playsInline/aria-hidden
});
// categories.test.tsx
it('renders all six categories as links to /products filtered by category', () => { /* 6 links, no rounded-full */ });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- hero categories` → FAIL.

- [ ] **Step 3: Rewrite both sections**

Hero: keep the existing `useMedia` desktop/mobile split and both media sources; remove the `p-6 … rounded-md` inset frame so it is truly full-bleed; overlay copy at grid columns 2–7 with `Reveal`. Categories: replace the 88px avatar circles with a left-aligned list of `DisplayHeading` size 3 entries separated by `HairlineRule`, each linking to `/products?category=…` as today.

- [ ] **Step 4: Run tests and lint**

Run: `npm test -- hero categories` → PASS. `npm run lint` → clean.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat: atelier hero and categories movements"
```

---

### Task 6: Movements 3–4 — Collection and Shop by Style

**Files:**
- Create: `components/sections/collection.tsx`, `components/sections/collection.test.tsx`
- Rewrite: `components/sections/shop-by-style.tsx`
- Delete: `components/sections/most-recommended.tsx`, `components/sections/explore.tsx`, `components/features/carousel/spotlight-carousel.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: Tasks 2–4, `/api/homepage-sections` (unchanged contract), `siteCopy.home.collection`.
- Produces: `<Collection />` — one editorial sequence replacing three rails, taking real products from `freshArrivals` and falling back to the dimmed non-clickable placeholder tier; `<ShopByStyle />` — one asymmetric tile per category.

- [ ] **Step 1: Write the failing tests**

```tsx
// collection.test.tsx — Review Focus #5
it('renders real products when the API returns them', async () => { /* mocks fetch with 2 products, asserts 2 tiles, no fallback */ });

it('falls back to the placeholder tier, dimmed and non-clickable, when the API returns empty arrays', async () => {
  // asserts fallback titles present, container has the dimmed class, and the entries render no <a>
});

it('falls back when the API returns a 500 and never throws', async () => {
  // fetch rejects / returns { error }, component still renders the fallback tier
});

it('renders the three named collection entries verbatim', async () => { /* from siteCopy */ });

it('absorbs the spotlight footage as part of the sequence', async () => { /* the three webm sources still referenced */ });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- collection` → FAIL.

- [ ] **Step 3: Implement `Collection` and rewrite `ShopByStyle`**

One `fetch('/api/homepage-sections')` for both (keep the existing single-request shape). Collection lays out large portrait `ProductTile`s at alternating column spans with the spotlight `webm` files as full-bleed interludes. Shop by Style renders one tile per category at varied spans. Both treat `{}`, `{ error }`, empty arrays and a rejected promise identically: render the fallback tier. Delete the three superseded section files and their imports.

- [ ] **Step 4: Run tests and lint**

Run: `npm test -- collection` → PASS. `npm run lint` → clean.

- [ ] **Step 5: Commit**

```bash
git add -A components/sections components/features/carousel app/page.tsx
git commit -m "feat: collection and shop-by-style movements, retire three rails"
```

---

### Task 7: Movements 5–6 — Atelier gallery and In Her Words

**Files:**
- Rewrite: `components/sections/slideshow.tsx` → `components/sections/atelier.tsx`, `components/sections/testimonials.tsx` → `components/sections/in-her-words.tsx`
- Delete: `components/sections/about.tsx` (absorbed)
- Create: `components/sections/in-her-words.test.tsx`, `components/sections/atelier.test.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: Tasks 2–4, `/api/slideshow` (unchanged `{ images: string[] }`).
- Produces: `<Atelier />` full-bleed gallery; `<InHerWords />` one quote at a time in display serif, paired with the About paragraph and both statistics.

- [ ] **Step 1: Write the failing tests**

```tsx
// in-her-words.test.tsx
it('renders one quote at a time in the display family', () => { /* 1 visible quote, font-display class */ });
it('advances to the next quote on control activation and is keyboard operable', async () => { /* 5 total, arrow/next focusable */ });
it('renders the About paragraph and both stats verbatim', () => { /* 15 / Years of Excellence, 5000+ / Happy Clients */ });
it('renders no attribution line, since all names are empty', () => { /* no "—" byline element */ });

// atelier.test.tsx
it('renders the images returned by /api/slideshow', async () => {});
it('renders nothing rather than a broken gallery when the endpoint returns an empty list', async () => {});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- in-her-words atelier` → FAIL.

- [ ] **Step 3: Implement both movements**

`InHerWords` sets the quote at display size 2 with the five entries from `siteCopy`, advancing by explicit control only (no autoplay, per the no-scroll-jacking rule), with `aria-live="polite"`. `Atelier` keeps the existing `/api/slideshow` fetch and fallback image, rendered full-bleed with `Reveal`. Remove the `rounded-2xl` frames and `bg-gray-50` grounds.

- [ ] **Step 4: Run tests and lint**

Run: `npm test -- in-her-words atelier` → PASS. `npm run lint` → clean.

- [ ] **Step 5: Commit**

```bash
git add -A components/sections app/page.tsx
git commit -m "feat: atelier gallery and in-her-words movements"
```

---

### Task 8: Movement 7 and footer

**Files:**
- Create: `components/sections/close.tsx`, `components/sections/close.test.tsx`, `components/layout/footer.test.tsx`
- Rewrite: `components/layout/footer.tsx`
- Delete: `components/sections/cta-banner.tsx`, `components/sections/our-values.tsx`, `components/sections/virasat-academy.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: Tasks 2–4.
- Produces: `<Close />` (WhatsApp and appointment lines as type, plus the Virasat Academy band linking `/virasat-academy`); `<Footer />` carrying the six value statements, the corrected contact details and the navigation.

- [ ] **Step 1: Write the failing tests**

```tsx
// close.test.tsx
it('keeps the WhatsApp link and renders no gradient card', () => {
  // href contains wa.me/919977057045; className has no "gradient" or "rose-"
});
it('links the Virasat Academy band to /virasat-academy with its copy verbatim', () => {});

// footer.test.tsx
it('renders all six value statements verbatim', () => {});
it('renders the real phone and email, not the placeholders', () => {
  expect(screen.getByRole('link', { name: /9977057045/ })).toHaveAttribute('href', 'tel:+919977057045');
  expect(screen.queryByText(/9876543210/)).toBeNull();
  expect(screen.queryByText(/hello@divyafal\.com/)).toBeNull();
});
it('omits social links entirely rather than linking to #', () => {
  expect(screen.queryByRole('link', { name: /instagram/i })?.getAttribute('href')).not.toBe('#');
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- close footer` → FAIL.

- [ ] **Step 3: Implement `Close` and rewrite `Footer`**

Both read `siteCopy`. No gradient grounds, no pills, no `rounded-3xl`. Social icons render only for URLs present in `siteCopy.footer.social`, which is currently empty — so they are omitted until the owner supplies them (spec §13).

- [ ] **Step 4: Run tests and lint**

Run: `npm test -- close footer` → PASS. `npm run lint` → clean.

- [ ] **Step 5: Commit**

```bash
git add -A components app/page.tsx
git commit -m "feat: close movement and footer with corrected contact details"
```

---

### Task 9: Navigation

**Files:**
- Rewrite: `components/layout/navbar.tsx`
- Create: `components/layout/navbar.test.tsx`
- Modify: `app/layout.tsx` (metadata, `main` padding)

**Interfaces:**
- Consumes: Tasks 2–4.
- Produces: `<NavBar />` — transparent over the hero, condensing to a paper ground with one soft lift on scroll; mobile opens a full-screen type menu.

- [ ] **Step 1: Write the failing tests**

```tsx
it('renders the primary links', () => { /* Shop, Sale, Virasat Academy, Contact */ });
it('opens a full-screen menu on mobile and traps focus while open', async () => {});
it('closes the menu on Escape and returns focus to the toggle', async () => {});
it('condenses once scrolled past the hero', () => { /* scroll event toggles the condensed class */ });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- navbar` → FAIL.

- [ ] **Step 3: Rewrite the navbar and update the layout**

Wordmark in Fraunces, links in Jost at 11px with `0.18em` tracking. Mobile menu is a full-viewport panel with `role="dialog"`, `aria-modal`, focus trap and Escape handling. Update `app/layout.tsx` metadata title/description from `siteCopy` and drop the fixed `pt-24` in favour of per-page spacing so the hero can sit under a transparent nav.

- [ ] **Step 4: Run tests and lint**

Run: `npm test -- navbar` → PASS. `npm run lint` → clean.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat: atelier navigation with full-screen mobile menu"
```

---

### Task 10: Listing pages — /products and /sale

**Files:**
- Rewrite: `app/products/page.tsx`, `app/sale/page.tsx`, `components/ui/sort-dropdown.tsx`
- Create: `components/features/products/filter-rail.tsx`, `app/products/products.test.tsx`

**Interfaces:**
- Consumes: Tasks 2–4, `/api/products` (unchanged query params).
- Produces: `<FilterRail value={…} onChange={…} />` as a quiet list, not chips; both pages render an editorial two-column masonry of `ProductTile`.

- [ ] **Step 1: Write the failing tests**

```tsx
it('renders a tile per product returned by the API', async () => {});
it('renders an editorial empty state when no products match', async () => { /* not a blank page */ });
it('keeps the existing category and sort query parameters', async () => { /* ?category=SAREE&sort=price_asc */ });
it('shows sale prices in the sale token on /sale', async () => {});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- products` → FAIL.

- [ ] **Step 3: Rewrite both pages, the sort control and the filter rail**

Keep the current fetch and param names exactly. Masonry via CSS columns at two tracks desktop, one mobile. Sort control is a native `<select>` styled with tokens, keeping keyboard behaviour for free.

- [ ] **Step 4: Run tests and lint**

Run: `npm test -- products` → PASS. `npm run lint` → clean.

- [ ] **Step 5: Commit**

```bash
git add -A app/products app/sale components
git commit -m "feat: editorial listing pages"
```

---

### Task 11: Product detail

**Files:**
- Rewrite: `components/features/products/product-hero.tsx`, `product-details.tsx`, `you-may-also-like.tsx`
- Modify: `app/product/[id]/page.tsx` (layout only — **keep `force-dynamic` and `revalidate = 0`**)
- Create: `components/features/products/product-details.test.tsx`

**Interfaces:**
- Consumes: Tasks 2–4, the existing page's Prisma read.
- Produces: a scrolling image column against a sticky detail column; WhatsApp enquiry as the primary action.

- [ ] **Step 1: Write the failing tests**

```tsx
it('renders name, resolved price and specifications', () => {});
it('renders every photo in the image column', () => {});
it('renders a labelled empty frame when the product has no photos', () => {}); // Review Focus #1
it('shows no sale badge when sale is true but salePrice is null', () => {}); // Review Focus #3
it('offers a WhatsApp enquiry carrying the product name', () => { /* wa.me link with encoded name */ });
it('keeps force-dynamic on the route', () => {
  // asserts the page module exports dynamic === 'force-dynamic'
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- product-details` → FAIL.

- [ ] **Step 3: Rewrite the three components and the page layout**

Two-column grid: images scroll in the left 7 columns, details stick in the right 4. Specifications render as a definition list. `you-may-also-like` keeps its `/api/products?limit=4` call and becomes a quiet four-up strip under a hairline rule. Do not touch the route's `dynamic`, `revalidate` or Prisma read.

- [ ] **Step 4: Run tests and lint**

Run: `npm test -- product-details` → PASS. `npm run lint` → clean.

- [ ] **Step 5: Commit**

```bash
git add -A components/features/products app/product
git commit -m "feat: editorial product detail page"
```

---

### Task 12: Remaining pages

**Files:**
- Rewrite: `app/virasat-academy/page.tsx`, `app/contact-us/page.tsx`, `components/layout/contact-us-hero.tsx`, `components/features/forms/contact-form.tsx` (styling only), `components/features/maps/store-location-map.tsx`, `app/refund-policy/page.tsx`, `app/cancellation-policy/page.tsx`
- Create: `app/contact-us/contact.test.tsx`

**Interfaces:**
- Consumes: Tasks 2–4, 9.
- Produces: restyled pages, all copy verbatim. The contact form's submit behaviour is **unchanged in Phase 1** — Phase 2 Task 9 wires it to `/api/enquiries`.

- [ ] **Step 1: Write the failing tests**

```tsx
it('renders every field with an associated label', () => {}); // a11y
it('renders the real contact details from siteCopy', () => {});
it('typesets both policy pages with a readable measure', () => { /* max-w token present */ });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- contact` → FAIL.

- [ ] **Step 3: Restyle the pages**

Long-form editorial for Virasat Academy and the two policies at a 68ch measure. Contact page pairs the form with the map; fields get visible labels and focus states. Do not change the form's `handleSubmit`.

- [ ] **Step 4: Run tests and lint**

Run: `npm test -- contact` → PASS. `npm run lint` → clean.

- [ ] **Step 5: Commit**

```bash
git add -A app components
git commit -m "feat: restyle academy, contact and policy pages"
```

---

### Task 13: Legacy-style sweep and release gate

**Files:**
- Create: `test/no-legacy-styles.test.ts`
- Modify: whatever the guard catches

**Interfaces:**
- Consumes: Tasks 2–12.
- Produces: a standing guard that the banned visual vocabulary cannot return.

- [ ] **Step 1: Write the failing test**

```ts
// test/no-legacy-styles.test.ts
const files = globSync(['app/**/*.tsx', 'components/**/*.tsx']);
const banned = [/rounded-3xl/, /rounded-full/, /bg-gradient-to/, /bg-linear-to/, /from-rose-/, /from-pink-/, /from-purple-/, /from-amber-/, /via-pink-/, /text-gray-\d00/, /bg-gray-\d00/];

it('uses no pills, gradients or grey-scale utilities outside the token system', () => {
  const offenders = files.flatMap(f => { /* collect file:line per banned match */ });
  expect(offenders).toEqual([]);
});

it('imports no runtime font loader', () => {
  expect(files.some(f => readFileSync(f, 'utf8').includes('next/font/google'))).toBe(false);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- no-legacy-styles`
Expected: FAIL, listing remaining offenders (admin dashboard files are expected here — exclude `app/dashboard/**`, which Phase 2 owns).

- [ ] **Step 3: Fix every offender in the storefront**

Replace with token utilities. Exclude only `app/dashboard/**` from the glob, with a comment pointing at the Phase 2 plan.

- [ ] **Step 4: Run the full gate**

Run, in order:
- `npm test` → all PASS
- `npm run lint` → clean
- `npm run build` → succeeds
- `npx next start` then Lighthouse on `/`, `/products`, `/product/[id]`: desktop ≥95 performance/accessibility/best-practices, mobile ≥90 performance and ≥95 accessibility/best-practices
- Manual pass at 390px, 768px, 1440px; confirm no horizontal scroll and the hero holds 100vh

Record the Lighthouse numbers in the commit body.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: legacy-style guard and phase 1 release gate"
```
