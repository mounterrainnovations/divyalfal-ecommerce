# Divyafal Revamp — Design

**Date:** 2026-11-16
**Repo:** `hopeworks-divyafal` (Next.js 16 App Router, React 19, TS, Tailwind 4, Prisma + Supabase)
**Scope:** Phase 1 — storefront revamp. Phase 2 — admin portal revamp with CMS.

---

## 1. Intent and why

Divyafal is a luxury couture studio (est. 2010, Bhopal; founder-designer Alpa Rawat). The site
currently works but looks like a generic Tailwind storefront: `rounded-3xl` cards, pastel gradient
banners (`rose-100 via-pink-50 to-purple-100`), default Inter/Times fallbacks, twelve stacked
sections of near-equal weight. Nothing in it signals the price of the clothes.

The revamp makes the site look as expensive as the product, end to end, without making it
complicated to use. Then it gives the client real control: a CMS-grade admin portal where the
photos and the words on the public site can be changed without a developer or a redeploy.

**Why now:** the storefront is the brand's shopfront and it undersells the work. The admin portal
today manages only products, so every marketing image and sentence is a code change — which means
the client cannot run their own site.

## 2. Goals

1. **Expensive at a glance.** Within the first viewport a visitor should read "couture house", not
   "ecommerce template".
2. **Award-level craft.** Deliberate type scale, real self-hosted fonts, an editorial grid,
   restrained motion, photography treated as the primary content.
3. **Simple UX.** Obvious navigation, three taps to any product, no scroll-jacking, no clever
   interactions that need learning. Accessible: visible focus, keyboard-operable, AA contrast.
4. **Every existing word preserved** verbatim (see §5).
5. **Looks intentional at 2 products** and still correct at 60.
6. **CMS control** of site imagery, marketing copy blocks, homepage curation and slideshow — all
   editable by the client in the admin portal.
7. **Admin portal that matches the brand** and is pleasant to use daily.

## 3. Non-goals

- No new storefront features: no cart, no checkout, no payments, no accounts, no wishlist, no search
  beyond what exists, no i18n.
- No backend replacement. Supabase stays the database and object store; Prisma stays the ORM.
- No headless CMS, no new hosted service, no new paid dependency.
- No content rewriting. Existing copy is reused word for word.
- No product data migration. The `Product` model is untouched.

## 4. Anti-goals (failure even if it ships)

- A site that looks expensive but is slow, or that janks on a mid-range Android.
- Decoration mistaken for luxury: gradient meshes, glassmorphism, drop shadows everywhere, gold on
  everything, animation for its own sake.
- A CMS so flexible the client can break the layout, or so rigid they still need a developer.
- Anything that silently changes or deletes the client's live product data.

## 5. Constraints

| Constraint | Source | Consequence |
|---|---|---|
| Keep all existing copy verbatim | Client instruction | The content inventory in §8 maps every sentence to its new home. Structure may change, words may not. |
| Keep the backend connection | Client instruction | Additive Prisma models on the same Supabase project. No connection string or ORM change. |
| 2 products in the live DB | Verified via `/api/health` | Low-inventory-first layout. No 4-up grids that render half-empty. |
| Deterministic builds, no runtime font fetch | `documents/codebase-context.md` | Fonts self-hosted as woff2 in `public/fonts` via `@font-face`. No `next/font/google`. |
| `public/slideshow` is read off disk at runtime | `app/api/slideshow/route.ts` | Unchangeable on Vercel. Must move into the DB + Supabase storage to be CMS-editable. |
| Third-party repo, client in production | `Pranav03Nair/hopeworks-divyafal` | Feature branch, no direct `main` pushes. Dev work must not write production data. |

### 5a. Decisions taken (2026-11-16)

Settled with the owner after a builder review of this document.

**Owner's calls:**

1. **Placeholder garments stay as a fallback tier, exactly as today.** The hardcoded entries in
   `explore.tsx`, `most-recommended.tsx` and `shop-by-style.tsx` (invented names and prices, images
   from `public/collection`, `public/mostrec`, `public/shop by style`) continue to render only when
   the DB returns nothing, dimmed and non-clickable. They are not promoted to real stock, and
   `HomepageSection.productIds` empty-means-auto falls back to this tier. Those directories are not
   migrated into Supabase storage.
2. **Phase 2 migrations and the seed run against the production database,** explicitly authorised.
   No second Supabase project, so no parameterising of the hostname in `next.config.ts` or the
   Supabase client/server files. Guardrails, non-negotiable: additive DDL only; `Product` never
   altered, read or written by the seed; a Supabase snapshot taken immediately before each
   migration; the seed written idempotent (upsert by `key`) so a re-run cannot duplicate or
   clobber; run against a scratch schema first to prove it; no destructive statement in any
   migration file.
3. **Enquiries get persisted.** A seventh admin rail section, backed by an `Enquiry` table, with
   read/unread and archive. The contact form stops discarding submissions. No email service.
4. **Both content bugs are fixed as bugs, not content changes.** The footer takes the real phone
   (9977057045) and email (divyafalthecreations@gmail.com) from `contact-form.tsx`; the founder is
   standardised to **Alpa Rawat** (the spelling used twice). Social links stay `href="#"` until the
   owner supplies real URLs — tracked in §13.

**Builder's calls, recorded here so a planner does not reopen them:**

5. **Section headings are structure, not content.** Body copy is verbatim; headings may merge and be
   renamed, since three product rails cannot all keep their titles inside one movement. Where a
   movement maps 1:1 the existing heading survives — Shop by Style, Virasat Academy, About.
6. **`/product/[id]` keeps `force-dynamic` and `revalidate = 0`.** `GEMINI.md` records it as a
   deliberate Vercel/Prisma production fix. §6c's cached server components apply to the other pages
   only; revisiting this route's rendering is out of scope.
7. **Hero and spotlight video stay.** Requires a `VIDEO` block kind, a widened MIME allowlist, a
   raised size cap and signed direct-to-storage upload, because `/api/upload` today caps at 5MB and
   rejects video. The three spotlight `webm` files are re-homed into the Atelier gallery rather than
   retired.
8. **Lighthouse targets split by form factor:** desktop ≥95 on performance, accessibility and
   best-practices; mobile ≥90 performance and ≥95 accessibility and best-practices. A 100vh
   autoplaying `webm` plus two self-hosted families cannot reach mobile 95, and keeping the video is
   the better brand call.
9. **The media library owns every asset,** including existing product photos, backfilled as
   `MediaAsset` rows by URL (no `Product` modification — matched on the stored URL string). "Used in
   N places" scans `Product.photos`, `ContentBlock.draft`/`published` JSON and `Slide`; deletion is
   blocked while an asset is referenced anywhere.
10. **Testimonials stay unattributed** — all five entries carry `name: ''`, so there is nothing to
    preserve. Design handles the absence rather than inventing attribution.

## 6. Approaches considered

### 6a. Aesthetic direction

| Direction | Trade-off |
|---|---|
| **Atelier Editorial — CHOSEN** | Warm paper ground, near-black ink, one hairline gold accent, large light display serif against small wide-tracked sans, asymmetric editorial grid, photography-led. Reads costly and quiet; ages well; works at 2 products. Costs more layout care than a grid of cards. |
| Gilded Heritage | Aubergine and antique gold, ornate rules, jewel tones. Unmistakably Indian couture and opulent on sight, but decorative styling slides toward wedding-vendor template — the opposite of award-level. |
| Gallery Minimal | Stark white, tiny grotesk, strict Swiss grid. Clean and cheap to build, but cold; reads as a tech storefront, fights the warmth of the content, and looks emptiest at 2 products. |

Chosen by the client. Rationale: it is the only one of the three where "expensive" comes from
restraint rather than ornament, which is also the one that survives low inventory and stays simple
to use.

### 6b. CMS architecture

| Option | Trade-off |
|---|---|
| **Additive Prisma models on the same Supabase — CHOSEN** | New tables alongside `Product`; reuses the existing `/api/upload` → Supabase storage path and the existing JWT admin session. No new service, no new cost, honours "keep the backend the same". Requires writing the editing UI by hand. |
| Headless CMS (Sanity / Payload) | Richer editing UI for free, but adds a second backend and a subscription, splits content between two systems, and contradicts the instruction to keep Supabase as the backend. |
| JSON content files in the repo | Zero schema change, but content can only change by redeploying — precisely the flaw the current disk-based slideshow has, and the client could never edit it themselves. |

### 6c. Rendering

Chosen: **server components reading Prisma directly, with tag-based `revalidateTag` on admin save.**
Pages render as cached static HTML and update seconds after an admin edit. Rejected: client-side
`useEffect` fetching (the current approach — it causes a loading-skeleton flash on every section and
costs a round trip before any pixel of content), and `force-dynamic` (fast to write, but every
visitor pays a DB round trip).

## 7. Design system

Defined once as CSS custom properties in `app/globals.css`, consumed through Tailwind 4 `@theme`.
Light only — no dark mode; a couture storefront has one correct ground.

**Palette** — five values, not a rainbow:

| Token | Value | Use |
|---|---|---|
| `--paper` | `#FAF7F2` | page ground, warm bone |
| `--paper-deep` | `#F1EBE1` | alternating section ground |
| `--ink` | `#141210` | all text, near-black not pure black |
| `--ink-soft` | `#6B635A` | secondary text, captions |
| `--gold` | `#A8873F` | hairline rules, active states, never fills |
| `--accent-sale` | `#8C2F2F` | sale price only, deep madder |

Gold appears as 1px rules and small marks only. No gradients anywhere. No shadows except a single
soft lift on the sticky nav once scrolled.

**Type** — self-hosted woff2, two families:

- **Display: Fraunces** (variable, OFL) — high-contrast, optical-size axis, distinctive without
  being the default Playfair. Used light (300–400) at large sizes only.
- **UI/body: Jost** (OFL) — geometric sans in the Futura lineage long used by fashion houses. Small
  sizes, wide tracking for eyebrows and nav.

Scale (desktop → mobile): display 96/72/56 → 44/36/28; body 17 → 16; caption 13; eyebrow 11 with
`0.18em` tracking, uppercase. Line height 1.05 on display, 1.65 on body. Measure capped at 68ch.

**Layout:** 12-column grid, 1440 max content width, 160px desktop section rhythm (96 mobile), 24px
mobile gutters. Asymmetry is the point — content sits at columns 2–7 or 6–12, rarely centred.

**Motion:** CSS only. Image reveal (opacity + 1.04→1 scale, 900ms, custom ease), text fade-up 24px
staggered 60ms, nav condense on scroll. All behind `prefers-reduced-motion`. No animation library,
no scroll-jacking, no parallax.

**Components to build:** `Eyebrow`, `DisplayHeading`, `HairlineRule`, `ProductTile` (portrait 3:4,
hover swaps to the second photo — existing components already carry one), `EditorialPair` (image +
offset text), `Marquee` (CSS, one brand line only), `Button` (text + rule, not a pill), `Field`,
`Dialog`, `Toast`.

Pills, `rounded-3xl`, and pastel gradients are removed throughout.

## 8. Storefront structure

### Homepage: 12 sections → 7 movements

Every sentence survives; redundant *containers* are merged.

| Now | Becomes | Note |
|---|---|---|
| Hero (static webp desktop / Supabase webm mobile) | **1. Hero** — full-bleed, 100vh, brand line and est. mark over it | Media becomes CMS-managed |
| Categories (avatar circles) | **2. Categories** — wide-tracked type list with hairline rules, no circles | Same 6 categories |
| Spotlight Carousel | folded into **3. Collection** | |
| Most Recommended | **3. Collection** — one editorial sequence of large portrait tiles | Three near-identical product rails become one. Fixes `freshArrivals` / `exploreCollection` returning the same 4 products. |
| Explore *(duplicate query)* | folded into **3. Collection** | Named collection copy ("Haldi & Kumkum Dress", "The Rajwadi Brocade", "Neelam Frill Lehenga") kept as that movement's own entries |
| Shop by Style | **4. Shop by Style** — one tile per category, asymmetric | Same items |
| Slideshow | **5. Atelier** — full-bleed gallery | Source moves from disk to `MediaAsset` |
| Testimonials | **6. In Her Words** — one quote at a time, large, set in display serif | All five quotes kept verbatim |
| About | **6. In Her Words** (same movement, paired) | The 2010 / 16-sarees paragraph and both stats (15 Years, 5000+) kept verbatim |
| CTA Banner | **7. Close** — WhatsApp and appointment lines as type, no gradient cards | Same links, `wa.me/919977057045` |
| Virasat Academy | **7. Close** — full-bleed band linking `/virasat-academy` | Same copy |
| Our Values | folded into footer | All six value sentences kept, set small in a footer column |

### Other pages

- `/products` — editorial two-column masonry; filters as a quiet rail, not chips. The existing
  `sort-dropdown` is rebuilt.
- `/product/[id]` — the biggest change in feel: a full-height image column scrolling against a
  sticky detail column. Price, specifications, category and sale badge all as today. WhatsApp
  enquiry is the primary action, since no cart exists.
- `/sale` — as `/products`, sale price in `--accent-sale`.
- `/virasat-academy` — long-form editorial, same copy.
- `/contact-us` — existing form and `store-location-map` restyled; form behaviour unchanged.
- `/refund-policy`, `/cancellation-policy` — typeset as readable documents, copy untouched.
- Nav and footer rebuilt; nav condenses on scroll, mobile menu becomes a full-screen type menu.

## 9. Admin portal (Phase 2)

Today: one 1,220-line `dashboard-client.tsx` holding login, product list, add/edit modals and
uploads. It becomes a routed, sectioned portal — same JWT auth, same `/api/admin/login`.

**Information architecture** — `/dashboard` with a left rail:

1. **Overview** — product count, items on sale, missing-photo warnings, last-edited content, link to `/api/health`.
2. **Products** — the existing CRUD, rebuilt: table with inline thumbnails, search, sort, pagination, drag-to-reorder photos, add/edit in a side sheet rather than a modal, delete behind a typed confirmation.
3. **Media library** — every uploaded image in one grid: upload (drag-drop, multi), alt text, tags, replace, delete, and "used in N places" so nothing in use is deleted by accident. Backed by `MediaAsset`.
4. **Pages & content** — the CMS core. Each editable block on the public site appears as a labelled field, grouped by the page and section it belongs to, with a thumbnail showing where it lands. Rich text via the existing TipTap editor. Images picked from the media library.
5. **Homepage curation** — reorder the seven movements, show or hide any, and hand-pick which products appear in Collection and Shop by Style instead of today's hardcoded price-band query.
6. **Settings** — contact details, WhatsApp number, social links, SEO title/description/OG image. This is the single source of truth that fixes the footer's placeholder phone and email (§5a.4).
7. **Enquiries** — submissions from the contact form, newest first, with unread count in the rail, read/unread toggle, archive, and the visitor's name, email, phone and message. Read-only apart from state; no replies are sent from the portal.

**Behaviour:** autosave drafts with an explicit Publish per block; an "unpublished changes" badge;
optimistic UI with toasts; every list and form keyboard-operable. Same Atelier palette and type,
tightened for density — small type, compact rows, spacing generous but not wasteful.

## 10. Data model additions

Additive only. `Product` is not modified.

```prisma
model MediaAsset {
  id        String   @id @default(uuid())
  url       String                       // Supabase storage public URL
  path      String                       // storage path, for deletion
  alt       String   @default("")
  width     Int?
  height    Int?
  mimeType  String
  bytes     Int
  tags      String[]
  createdAt DateTime @default(now())
  slides    Slide[]
}

model ContentBlock {
  id        String    @id @default(uuid())
  key       String    @unique            // e.g. "home.hero.brandLine"
  page      String                       // "home" | "about" | ...
  section   String                       // "hero" | "collection" | ...
  label     String                       // human label shown in admin
  kind      BlockKind
  draft     Json                         // editing value
  published Json?                        // value the public site reads
  updatedAt DateTime  @updatedAt
}

enum BlockKind { TEXT RICH_TEXT IMAGE IMAGE_LIST VIDEO NUMBER LINK }

model HomepageSection {
  id         String   @id @default(uuid())
  key        String   @unique            // "hero" | "categories" | ...
  label      String
  order      Int
  visible    Boolean  @default(true)
  productIds String[]                    // hand-picked curation; empty = auto
  updatedAt  DateTime @updatedAt
}

model Slide {
  id      String     @id @default(uuid())
  assetId String
  asset   MediaAsset @relation(fields: [assetId], references: [id])
  order   Int
  visible Boolean    @default(true)
}

model SiteSetting {
  key       String   @id                 // "whatsapp" | "seo.title" | ...
  value     Json
  updatedAt DateTime @updatedAt
}

model Enquiry {
  id        String        @id @default(uuid())
  name      String
  email     String
  phone     String?
  message   String
  status    EnquiryStatus @default(UNREAD)
  createdAt DateTime      @default(now())

  @@index([status, createdAt])
}

enum EnquiryStatus { UNREAD READ ARCHIVED }
```

`MediaAsset` gains `kind MediaKind @default(IMAGE)` with `enum MediaKind { IMAGE VIDEO }` to carry
the hero and spotlight footage (§5a.7).

Seeding: a one-off script writes today's hardcoded copy and image paths into `ContentBlock` and
`HomepageSection` as both draft and published, so the public site renders identically the moment it
switches to DB-backed content, and nothing is lost.

## 11. API additions

Existing routes keep their contracts. New routes, all admin-authenticated except the public reads:

- `GET /api/content?page=` — published blocks for a page (public, cached, tagged).
- `GET|PUT /api/admin/content/[key]` — read and write a draft, publish it.
- `POST /api/admin/content/publish` — publish a set, then `revalidateTag`.
- `GET|POST /api/admin/media`, `DELETE /api/admin/media/[id]` — library over the existing upload path.
- `GET|PUT /api/admin/homepage` — section order, visibility, curation.
- `GET|PUT /api/admin/settings`.
- `GET /api/slideshow` — **reimplemented** over `Slide` + `MediaAsset`, same response shape
  (`{ images: string[] }`), so nothing consuming it breaks.
- `POST /api/enquiries` — public, rate-limited, writes an `Enquiry`. The contact form's empty
  `TODO` handler finally posts here.
- `GET /api/admin/enquiries`, `PATCH /api/admin/enquiries/[id]` — list and set status.
- `POST /api/upload` — **extended**, not replaced: video MIME types allowed, size cap raised for
  video, and a signed direct-to-storage path for files above the serverless body limit. A
  server-side admin check is added (it has none today). Image behaviour and response shape are
  unchanged.

Auth moves into `middleware.ts` for `/dashboard` and `/api/admin/*`, replacing today's client-side
check. Uploads gain the server-side auth check they currently lack.

## 12. Phasing

- **Phase 1 — storefront.** Design system, components, the seven homepage movements, remaining
  pages. Content stays hardcoded; the site reads identically to a visitor's eye but in the new
  design.
- **Phase 2 — admin and CMS.** Schema, seeding, portal rebuild, then flip the storefront's reads
  from hardcoded constants to published content. Flipping last means Phase 1 ships standalone if
  Phase 2 is deferred.

**Phase 2 database cutover**, in this order (per §5a.2, against production):

1. Snapshot the Supabase project.
2. Apply the additive migration to a scratch schema first; confirm it is additive and that `Product`
   is untouched.
3. `prisma migrate deploy` against production. The build command gains no migrate step — migrations
   stay a deliberate manual action, never a side effect of a deploy.
4. Run the idempotent seed (upsert by `key`); verify the public site still renders identically.
5. Only then flip the storefront's reads to published content.

Each phase ends with `npm run lint`, `npm run build`, the §5a.8 Lighthouse targets for `/`,
`/products` and `/product/[id]`, and a manual pass at 390px, 768px and 1440px.

## 13. Risks and owner to-dos

| Risk | Handling |
|---|---|
| Phase 2 migrations run against the client's production DB | Owner-authorised (§5a.2). Mitigated by the guardrails there and the §12 cutover order. This is the highest-consequence item in the project; no step may be skipped for speed. |
| `.env` is committed with `SERVICE_ROLE_KEY`, `JWT_SECRET` and admin `EMAIL`/`PASSWORD` | Flagged to the owner: rotate and gitignore. Not blocking Phase 1. |
| 2 live products | The low-inventory design absorbs it, but the site will look far better with real stock and real photography. Owner to load it. |
| Placeholder garments remain in the fallback tier | Owner's call (§5a.1). They only appear when the DB returns nothing — which, at 2 products, is often. Adding real stock is what retires them. |
| Photography quality caps the ceiling | Editorial design magnifies image quality, good and bad. Flagged. |
| Testimonial photos may not be cleared for use | Five customer photos get enlarged by the new treatment. Owner to confirm rights. |
| `/api/homepage-sections` price-band bug (comment says ₹10–20k, code queries ₹5–10k) | Superseded in Phase 2 by explicit curation; left alone in Phase 1. |
| Real social URLs unknown | Footer links stay `href="#"` until the owner supplies Instagram and any others; `SiteSetting` is ready to hold them. |

## 14. Left to the builder

- Exact Fraunces axis values and Jost weights; subset and preloaded.
- Per-section grid column spans and crop ratios within the §7 system.
- Easing curves and stagger timings within the §7 motion budget.
- Admin component composition (sheets, tables, field primitives).
- Error, empty and loading states for every admin surface.
- The seed script's exact block keys, following `page.section.field`.
