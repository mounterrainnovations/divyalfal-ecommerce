# Sample imagery: PLACEHOLDERS, not launch content

Everything under `public/samples/` is an **interim stand-in**, installed so the storefront can be
judged with real photography in place of the previous low-resolution assets. None of it is
Divyafal's own work, none of it shows Divyafal garments, and none of it should reach launch.
Each file carries the same warning in its embedded EXIF `ImageDescription`.

To change an image, replace the file (or repoint its key, see below) and delete its row here.
When the last row is gone, delete this folder, the `samples/atelier` entry in
`app/api/slideshow/route.ts`, and the six `samples/categories` paths in `lib/content/site-copy.ts`
and `lib/common/product-interfaces.ts`.

## Licence

Every file is an **Unsplash** photograph, "Free to use under the Unsplash License"
(https://unsplash.com/license): commercial use permitted, no attribution required. The licence
string was read off each photograph's **own** Unsplash page — not inferred from a search listing —
and every one is a free photo, not an Unsplash+ one. Pexels was not used.

- Download date for every file: **2026-11-17**.
- Pixel source: `images.unsplash.com/<photo id>` at q=85 JPEG, fetched at up to 3000px (4200px for
  the hero, 5000–6000px for two frames whose 3000px bound was shorter than the target).
- Modifications: a centred `object-cover` crop to the target box and a resize to roughly 2x the
  slot's rendered CSS size, then a WebP re-encode (q66–76, dropped in steps of 6 only where a file
  exceeded its per-slot byte cap). No retouching, no grading, no composites.

### Model releases, and why no face is in the set

The Unsplash licence does **not** include model or property releases. The previous sample set had
**12 of 23 frames showing identifiable people**, which on a live commercial storefront implies an
endorsement nobody agreed to. **No frame in this set shows an identifiable face.** Three frames
show a craftsperson's hands (and, in two, a sleeve or a torso) with the face outside the crop; the
"person identifiable" column below records that for every file, which is what makes the
model-release question auditable rather than a matter of trust.

Two further rules were applied at selection and cost several otherwise good frames:

- **Nothing a viewer could read as another house's garment.** Two museum-display gowns and a
  Paris exhibition piece were dropped on this ground, along with three kimono frames and a
  Tanzanian kanga, which also read as another culture's dress on an Indian couture storefront.
- **Nothing synthetic.** One strong hero candidate (`CHTdkppXXhE`) was dropped once its own page
  described it as "a dark, rich, **3D rendered** original Art Nouveau styled cloth"; two beige
  "linen" textures were dropped for the same reason (tagged `Blender 3D`). One Smithsonian frame
  was dropped because its page did not carry the licence string, and the rule is that an
  unverifiable licence is a reason not to use the photograph.

## The coherence rule

**One house, one light, one ground.** Every frame is **material or craft** — woven cloth,
embroidery, zari, thread, a loom, folded or hung garments, hands at work — photographed in **soft
directional daylight** (no flash, no studio key, no night or artificial colour cast), on a **warm
ground**: ivory, sand, bronze and old gold, with deep red and ink as the only strong accents. No
face in any frame.

It was enforced three ways rather than by eye alone:

1. **A subject rule at selection.** Nothing whose subject is a person. Where a garment is shown,
   it is hung, laid out or on a display form.
2. **A measured hue gate on every installed file.** Mean channel means converted to HSV; a file is
   in the set only if its mean hue falls in the warm band. **All 30 pass: the measured range is
   351° to 53°**, i.e. russet through gold, with nothing green, blue or magenta. Four frames were
   installed, measured, and then swapped out on this gate (two suzani macros whose green vines
   broke the ground, one acid-yellow brocade, one off-palette back tile).
3. **A per-slot tone band.** Frames seen together were kept within one luminance range — the six
   category previews sit at mean luminance 0.32–0.72, the three gallery frames at 0.37–0.73 — so
   no single frame reads as "flash" beside its neighbours.

## Files

| File | Subject | Pixels | Bytes | Person identifiable? | Photographer | Photo page (licence read here) |
| --- | --- | --- | --- | --- | --- | --- |
| `hero/hero-golden-warp-on-the-loom.webp` | Golden warp threads running into a dark loom | 3200x1900 | 560 KB | no | [iggii](https://unsplash.com/@iggii) | https://unsplash.com/photos/time-lapse-photography-of-road-2OuTr9_VaUg |
| `categories/category-sarees-embroidered-stole.webp` | Sheer ivory stole with pale floral embroidery (Art Institute of Chicago, Long Stole, France 1795-1810) | 1400x1750 | 100 KB | no | [artchicago](https://unsplash.com/@artchicago) | https://unsplash.com/photos/delicate-floral-pattern-on-sheer-fabric-y7tVccMw_Ko |
| `categories/category-indo-western-gold-silk-daylight.webp` | Gold silk in natural light | 1400x1750 | 67 KB | no | [susan_wilkinson](https://unsplash.com/@susan_wilkinson) | https://unsplash.com/photos/white-textile-in-close-up-photography-zbhyU5X9yfw |
| `categories/category-lehengas-hung-on-the-door.webp` | Red and gold embroidered lehenga hung on a carved wooden door | 1400x1750 | 246 KB | no | [amarpoems08](https://unsplash.com/@amarpoems08) | https://unsplash.com/photos/red-and-gold-embroidered-lehenga-eYbmFo_clng |
| `categories/category-suits-ivory-on-wooden-hangers.webp` | Ivory garments on wooden hangers, directional daylight | 1400x1750 | 144 KB | no | [lowmurmer](https://unsplash.com/@lowmurmer) | https://unsplash.com/photos/white-dress-shirt-hanged-on-brown-wooden-clothes-hanger-nAJEr8KlUnE |
| `categories/category-kurta-pant-hung-set.webp` | Ivory kurta-and-trouser set hung on a rail | 1400x1750 | 77 KB | no | [holawalterlee](https://unsplash.com/@holawalterlee) | https://unsplash.com/photos/a-shirt-is-hanging-on-a-rack-in-a-room-8GCc4bzM5JQ |
| `categories/category-western-pale-rail.webp` | Pale garments on a rail, soft daylight | 1400x1750 | 89 KB | no | [micheile](https://unsplash.com/@micheile) | https://unsplash.com/photos/clothes-hanging-on-white-rack-FpPcoOAk5PI |
| `atelier/atelier-1-cloth-block-and-chalk.webp` | Cream cloth, a printing block and chalk lines on a work table | 1700x1700 | 267 KB | no | [darshanp9](https://unsplash.com/@darshanp9) | https://unsplash.com/photos/bundled-fabric-scraps-and-a-wooden-stick-on-cloth-b5lG0vuvqvo |
| `atelier/atelier-2-hands-at-the-cloth.webp` | Hands drawing an intricate design onto cream cloth | 1700x1700 | 298 KB | **hands and torso only, face outside the crop** | [darshanp9](https://unsplash.com/@darshanp9) | https://unsplash.com/photos/man-painting-intricate-designs-on-fabric-jZJ8IoqaMFo |
| `atelier/atelier-3-the-cutting-table.webp` | A tailor's hands cutting cloth on a wooden table | 1700x1700 | 289 KB | **hands and sleeves only, face outside the crop** | [godoyvisual](https://unsplash.com/@godoyvisual) | https://unsplash.com/photos/person-in-black-suit-holding-brown-leather-bag-ksLWYYmK-0k |
| `mostrec/mostrec-1-red-banarasi-zari-border.webp` | Red banarasi silk with a zari border and pearls | 1200x1600 | 290 KB | no | [ukotasthane](https://unsplash.com/@ukotasthane) | https://unsplash.com/photos/gold-and-silver-beaded-bracelet-gl-KSnRyhE0 |
| `mostrec/mostrec-2-gold-embroidery-on-brown.webp` | Gold metallic floral embroidery on dark brown cloth | 1200x1600 | 317 KB | no | [hdbernd](https://unsplash.com/@hdbernd) | https://unsplash.com/photos/gold-floral-embroidery-on-fabric-8zSR5HjPJ9A |
| `mostrec/mostrec-3-ivory-chikan-sequin-work.webp` | Ivory cloth with white chikan work and sequins | 1200x1600 | 311 KB | no | [saubhagya2304](https://unsplash.com/@saubhagya2304) | https://unsplash.com/photos/a-close-up-of-a-bed-with-a-pattern-on-it-p0_9uZfThaY |
| `mostrec/mostrec-4-peach-and-maroon-banarasi.webp` | Peach and maroon banarasi silk with zari borders | 1200x1600 | 432 KB | no | [squadearrow](https://unsplash.com/@squadearrow) | https://unsplash.com/photos/a-close-up-of-a-piece-of-cloth-RpbzwZu4ftg |
| `style/style-1-front-ivory-raw-silk-folds.webp` | Ivory raw silk in soft folds | 1200x1600 | 123 KB | no | [kate_gliz](https://unsplash.com/@kate_gliz) | https://unsplash.com/photos/a-close-up-of-a-bed-with-a-white-sheet-2NDtPNiLcD0 |
| `style/style-1-back-floral-skirt-panel.webp` | Floral pattern on textured cloth (Art Institute of Chicago, Skirt Panel, Europe 1840-1860) | 1200x1600 | 306 KB | no | [artchicago](https://unsplash.com/@artchicago) | https://unsplash.com/photos/intricate-floral-pattern-on-a-textured-fabric-nECy3D-Enpo |
| `style/style-2-front-cream-woven-block-design.webp` | Cream cloth with a woven block design | 1200x1600 | 572 KB | no | [oxganggreen](https://unsplash.com/@oxganggreen) | https://unsplash.com/photos/a-close-up-of-a-blanket-with-a-design-on-it-PqkOjQe7rhk |
| `style/style-2-back-white-cloth-on-wood.webp` | White cloth laid on a wooden table | 1200x1600 | 32 KB | no | [julissasantana](https://unsplash.com/@julissasantana) | https://unsplash.com/photos/white-textile-on-brown-wooden-table-B99QPn0T_7Q |
| `style/style-3-front-gold-medallions.webp` | Gold cloth with circular floral medallions | 1200x1600 | 683 KB | no | [hdbernd](https://unsplash.com/@hdbernd) | https://unsplash.com/photos/gold-floral-fabric-with-circular-medallions-7-0JVx25C3w |
| `style/style-3-back-paisley-on-russet.webp` | Floral and paisley patterns on a russet ground (The Metropolitan Museum of Art) | 1200x1600 | 334 KB | no | [metropolitanmuseum](https://unsplash.com/@metropolitanmuseum) | https://unsplash.com/photos/intricate-floral-and-paisley-patterns-on-a-reddish-brown-background-IRHvt0kfuhc |
| `style/style-4-front-flowing-gold-silk.webp` | Flowing gold silk | 1200x1600 | 126 KB | no | [susan_wilkinson](https://unsplash.com/@susan_wilkinson) | https://unsplash.com/photos/person-in-white-crew-neck-shirt-G1aRELsnXTU |
| `style/style-4-back-silk-afternoon-light.webp` | Silk in afternoon light | 1200x1600 | 56 KB | no | [susan_wilkinson](https://unsplash.com/@susan_wilkinson) | https://unsplash.com/photos/a-close-up-view-of-a-satin-fabric-_mNqvJhpzrg |
| `collection/collection-1-front-embroidered-spray-on-beige.webp` | Embroidered flower, leaves and buds on a beige ground (Art Institute of Chicago) | 1536x2048 | 277 KB | no | [artchicago](https://unsplash.com/@artchicago) | https://unsplash.com/photos/embroidered-flower-with-leaves-and-buds-on-beige-background-EAj3vzlCKew |
| `collection/collection-1-back-gold-warp-threads.webp` | Gold warp threads drawn across a loom | 1536x2048 | 121 KB | no | [odd_fellow](https://unsplash.com/@odd_fellow) | https://unsplash.com/photos/yellow-and-brown-wooden-board-PBWaFBiUxeo |
| `collection/collection-2-front-cream-satin-folds.webp` | Cream satin in soft folds | 1536x2048 | 152 KB | no | [susan_wilkinson](https://unsplash.com/@susan_wilkinson) | https://unsplash.com/photos/cream-satin-fabric-with-soft-folds-R_bv0S9MC8c |
| `collection/collection-2-back-champagne-silk.webp` | Champagne silk in natural light | 1536x2048 | 147 KB | no | [susan_wilkinson](https://unsplash.com/@susan_wilkinson) | https://unsplash.com/photos/brown-textile-in-close-up-photography-Hrgv_0fmOI4 |
| `collection/collection-3-front-silk-afternoon-light.webp` | Silk in afternoon light | 1536x2048 | 149 KB | no | [susan_wilkinson](https://unsplash.com/@susan_wilkinson) | https://unsplash.com/photos/a-close-up-view-of-a-beige-fabric-wBCOGnMMXVA |
| `collection/collection-3-back-swatchbook-floral.webp` | Floral swatch on a cream ground (Te Papa, textile swatchbook, 1890s France) | 1536x2048 | 411 KB | no | [tepapa](https://unsplash.com/@tepapa) | https://unsplash.com/photos/delicate-floral-pattern-on-a-cream-background-OXnsxIDYSfI |
| `collection/collection-4-front-hands-sewing.webp` | Hands sewing white cloth with a needle | 1536x2048 | 97 KB | **hands only, face outside the crop** | [eliomendes](https://unsplash.com/@eliomendes) | https://unsplash.com/photos/hands-sewing-white-fabric-5ZQn_gWKvLE |
| `collection/collection-4-back-thread-spools.webp` | Spools of thread in browns and golds | 1536x2048 | 120 KB | no | [lensyfoxography](https://unsplash.com/@lensyfoxography) | https://unsplash.com/photos/a-group-of-spools-of-thread-sitting-on-top-of-each-other-xZSuLxiqXUo |

**30 files, 7.02 MiB** (the set this replaces was 23 files and 4.38 MiB; the growth is explained in
`.superpowers/sdd/2026-11-16-admin-cms/imagery-v2-report.md`).

## Intrinsic size against the slot it fills

Every file is at least 2x the largest CSS size its slot renders at, so it holds at DPR 2.

| Slot | Largest rendered CSS size | 2x requirement | Installed | Headroom |
| --- | --- | --- | --- | --- |
| Hero | 1440x900 (and 1920x1080) | 2880x1800 | 3200x1900 | 1.11x |
| Category preview | 558x675 at 1440 (565x675 at 1920) | 1130x1350 | 1400x1750 | 1.24x |
| Gallery band, widest panel | 593x594 at 1440 (793x794 at 1920) | 1586x1588 | 1700x1700 | 1.07x |
| Gallery band, narrowest panel | 356x594 at 1440 | 712x1188 | 1700x1700 | 1.43x on the short axis |
| Shop By Style tile | 526x701 at 1440 | 1052x1402 | 1200x1600 | 1.14x |
| Collection lookbook tile | 755x1007 at 1440 | 1510x2014 | 1536x2048 | 1.02x |
| Retired rail (`bestSellers`) | not rendered | — | 1200x1600 | — |

There is no shortfall. The gallery band is the slot that sets its own size twice over: it is
full-bleed, so its widest panel is 593px at 1440 but 793px at 1920, and its narrowest is a 0.60
portrait that an `object-cover` crop takes a 40% bite out of horizontally. Square 1700x1700 frames
cover both -- 1700 >= the 1586 that 1920 at DPR 2 asks for, and the full 1700 of height survives
the portrait crop. That squareness is deliberate: the previous atelier frames were 1.50 and 1.78
landscapes, and the third panel showed the middle third of them.

## Where each one is wired

| Key / consumer | Points at |
| --- | --- |
| `siteCopy.home.hero.desktopImage` | `hero/hero-golden-warp-on-the-loom.webp` |
| `siteCopy.home.categories.items[0..5].image` **and** `CATEGORY_CONFIG[0..5].image` | `categories/category-*.webp` (one per collection, same path in both lists; a test pins them equal) |
| `siteCopy.home.recommended.bestSellers[0..3].image` | `mostrec/mostrec-1..4-*.webp` |
| `siteCopy.home.collection[0..3].image` / `.backImage` | `collection/collection-N-front-*` / `collection-N-back-*` |
| `siteCopy.home.style.items[0..3].frontImage` / `.backImage` | `style/style-N-front-*` / `style-N-back-*` |
| `GET /api/slideshow` (the Atelier movement) | lists `public/slideshow/*`, then `samples/atelier/*` |

The six category photographs **moved into this folder**. They used to be
`public/categories/{saree.jpg, indo_western.jpg, lehenge.webp, suits.jpg, kurta.jpg, western.png}` —
six unprovenanced commercial fashion frames, all six showing an identifiable person, by six
different photographers, with no licence record anywhere in the repo, and one of them
(`lehenge.webp`, 368x399) rendering into a 558px frame. They are **not deleted**: the originals
are untouched in `public/categories/`, so nothing is lost if the owner can produce a licence for
them. Only the two lists that point at them changed.

The original files in `public/collection/`, `public/mostrec/`, `public/shop by style/`,
`public/slideshow/`, `public/testimonials/` and `public/mocks/` are untouched.

## Hero brief this satisfies

No text, no logo, no person, 3200px wide (>= 2880 for DPR 2 at 1440), warm, and dark enough in its
lower left — the corner the wordmark sits in — to hold large-text AA under a flat 25% ink wash
(measured: 3.08:1 at 1440x900 and 1920x1080, against 1.88:1 with no wash at all). Subject: the
golden warp of a working loom. It replaces a black silk drape, which needed no wash but said
nothing about the house.
