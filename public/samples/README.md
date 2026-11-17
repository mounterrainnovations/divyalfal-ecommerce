# Sample imagery: PLACEHOLDERS, not launch content

Everything under `public/samples/` is an **interim stand-in**, installed so the storefront can be
judged with real photography in place of the previous low-resolution assets. None of it is
Divyafal's own work, none of it shows Divyafal garments, and none of it should reach launch.
Each file carries the same warning in its embedded EXIF `ImageDescription`.

To change an image, replace the file (or repoint its key, see below) and delete its row here.
When the last row is gone, delete this folder and the `samples/atelier` entry in
`app/api/slideshow/route.ts`.

## Licence

Every file is an **Unsplash** photograph, "Free to use under the Unsplash License"
(https://unsplash.com/license): commercial use permitted, no attribution required. The licence
was read off each photograph's own Unsplash page (not inferred from a search listing) and each
is a free photo, not an Unsplash+ one. Pexels was not used.

- Download date for every file: **2026-11-17**.
- Pixel source: `images.unsplash.com/<photo id>` at up to 2400px (3200px for the hero), q=88 JPEG.
- Modifications: cropped (hero: top 3200x1900 band of a portrait original; garment tiles: centred
  3:4 crop to match the `aspect-[3/4]` cells they render in; one atelier frame: centred 16:9 band),
  downsized where larger than the target, re-encoded to WebP (q74-76). No retouching or grading.
- The Unsplash licence does **not** include model or property releases. Several garment frames show
  identifiable people. That is acceptable for an interim stand-in and is a reason none of these
  belong in launch copy.

## Files

| File | Pixels | Bytes | Photographer / source page | URL |
| --- | --- | --- | --- | --- |
| `hero/hero-black-silk-drape.webp` | 3200x1900 | 129 KB | [Kateryna Hliznitsova](https://unsplash.com/photos/a-black-background-with-a-very-large-amount-of-fabric-9Tre3EXnF0g) | https://unsplash.com/photos/a-black-background-with-a-very-large-amount-of-fabric-9Tre3EXnF0g |
| `collection/collection-1-front-bridal-lehenga-red-gold.webp` | 1200x1600 | 213 KB | [Harsh Gupta](https://unsplash.com/photos/a-woman-in-a-red-and-gold-bridal-outfit-2DZmm6QKFQE) | https://unsplash.com/photos/a-woman-in-a-red-and-gold-bridal-outfit-2DZmm6QKFQE |
| `collection/collection-1-back-red-gold-embroidery-motifs.webp` | 1200x1600 | 450 KB | [Abhishek Sharma](https://unsplash.com/photos/a-close-up-of-a-red-and-gold-dress-z8dUDjXEdno) | https://unsplash.com/photos/a-close-up-of-a-red-and-gold-dress-z8dUDjXEdno |
| `collection/collection-2-front-lilac-lehenga-garden.webp` | 1200x1600 | 281 KB | [Ardy Arjun](https://unsplash.com/photos/a-woman-in-a-long-dress-standing-in-a-garden-pkqmkwkApgA) | https://unsplash.com/photos/a-woman-in-a-long-dress-standing-in-a-garden-pkqmkwkApgA |
| `collection/collection-2-back-white-silk-drape.webp` | 1200x1600 | 154 KB | [Susan Wilkinson](https://unsplash.com/photos/draped-white-silk-fabric-folds-PyjLCMReMns) | https://unsplash.com/photos/draped-white-silk-fabric-folds-PyjLCMReMns |
| `collection/collection-3-front-red-gown-gravel.webp` | 1200x1600 | 157 KB | [Ardy Arjun](https://unsplash.com/photos/a-woman-in-a-red-dress-scTC9VKQPkk) | https://unsplash.com/photos/a-woman-in-a-red-dress-scTC9VKQPkk |
| `collection/collection-3-back-red-gold-embroidery-detail.webp` | 1200x1600 | 152 KB | [Abhishek Sharma](https://unsplash.com/photos/a-close-up-of-a-red-and-gold-dress-sOga_fHfoek) | https://unsplash.com/photos/a-close-up-of-a-red-and-gold-dress-sOga_fHfoek |
| `collection/collection-4-front-bride-red-lehenga-veil.webp` | 1200x1600 | 265 KB | [Royal Photography](https://unsplash.com/photos/a-bride-in-a-traditional-red-lehenga-and-veil-5gVAj1k-FBA) | https://unsplash.com/photos/a-bride-in-a-traditional-red-lehenga-and-veil-5gVAj1k-FBA |
| `collection/collection-4-back-mirrorwork-embroidery.webp` | 1200x1600 | 301 KB | [antonio massara](https://unsplash.com/photos/intricate-embroidery-with-mirrors-and-thread-Kp_4kShscHM) | https://unsplash.com/photos/intricate-embroidery-with-mirrors-and-thread-Kp_4kShscHM |
| `mostrec/mostrec-1-pink-orange-silk-saree.webp` | 1200x1600 | 173 KB | [Sabesh Photography LTD](https://unsplash.com/photos/woman-in-sari-with-gold-jewelry-Xqa_NWl4xEY) | https://unsplash.com/photos/woman-in-sari-with-gold-jewelry-Xqa_NWl4xEY |
| `mostrec/mostrec-2-green-silk-saree.webp` | 1200x1600 | 169 KB | [Sabesh Photography LTD](https://unsplash.com/photos/a-woman-wearing-a-green-sari-and-jewelry-njVir8eVq1M) | https://unsplash.com/photos/a-woman-wearing-a-green-sari-and-jewelry-njVir8eVq1M |
| `mostrec/mostrec-3-white-dupatta-lehenga.webp` | 1200x1600 | 119 KB | [Bernie Almanzar](https://unsplash.com/photos/woman-in-white-long-sleeve-dress-standing-on-gray-concrete-pavement-during-daytime-bbE9VOyqKxo) | https://unsplash.com/photos/woman-in-white-long-sleeve-dress-standing-on-gray-concrete-pavement-during-daytime-bbE9VOyqKxo |
| `mostrec/mostrec-4-yellow-lehenga-crop-top.webp` | 1200x1600 | 98 KB | [Kunal Goswami](https://unsplash.com/photos/woman-wearing-white-crop-top-and-yellow-long-skirt-dz0Q0FS_oTQ) | https://unsplash.com/photos/woman-wearing-white-crop-top-and-yellow-long-skirt-dz0Q0FS_oTQ |
| `style/style-1-front-green-sari-dusk.webp` | 1200x1600 | 164 KB | [Mehedi Hasan](https://unsplash.com/photos/a-young-woman-in-a-green-sari-smiles-warmly-outdoors-ws388aWhWwM) | https://unsplash.com/photos/a-young-woman-in-a-green-sari-smiles-warmly-outdoors-ws388aWhWwM |
| `style/style-1-back-embroidered-fabric-stack.webp` | 1013x1351 | 183 KB | [Jainica Dhingra](https://unsplash.com/photos/a-pile-of-different-types-of-cloths-on-a-table-udCX1mvNFos) | https://unsplash.com/photos/a-pile-of-different-types-of-cloths-on-a-table-udCX1mvNFos |
| `style/style-2-front-blue-floral-sari.webp` | 1200x1600 | 202 KB | [Horitoki Ltd](https://unsplash.com/photos/a-beautiful-woman-in-a-colorful-sari-dCuCMZ9XnHg) | https://unsplash.com/photos/a-beautiful-woman-in-a-colorful-sari-dCuCMZ9XnHg |
| `style/style-2-back-embroidered-cloth-detail.webp` | 1200x1600 | 185 KB | [Compagnons](https://unsplash.com/photos/a-close-up-of-a-embroidered-object-on-a-cloth-l4h_BJzHKdk) | https://unsplash.com/photos/a-close-up-of-a-embroidered-object-on-a-cloth-l4h_BJzHKdk |
| `style/style-3-front-cream-gold-lehenga.webp` | 1200x1600 | 71 KB | [The Behruz Theory](https://unsplash.com/photos/a-woman-wearing-a-white-sari-and-a-necklace-wusSGdCQQVA) | https://unsplash.com/photos/a-woman-wearing-a-white-sari-and-a-necklace-wusSGdCQQVA |
| `style/style-3-back-gold-satin-drape.webp` | 1200x1600 | 62 KB | [Susan Wilkinson](https://unsplash.com/photos/pink-textile-in-close-up-photography-rZehiCZMWgM) | https://unsplash.com/photos/pink-textile-in-close-up-photography-rZehiCZMWgM |
| `style/style-4-front-purple-sari-gold-border.webp` | 1200x1600 | 102 KB | [Bulbul Ahmed](https://unsplash.com/photos/woman-in-red-and-brown-sari-xTrp1WOq2Do) | https://unsplash.com/photos/woman-in-red-and-brown-sari-xTrp1WOq2Do |
| `style/style-4-back-brown-silk-texture.webp` | 1200x1600 | 75 KB | [Susan Wilkinson](https://unsplash.com/photos/brown-textile-in-close-up-photography-Hrgv_0fmOI4) | https://unsplash.com/photos/brown-textile-in-close-up-photography-Hrgv_0fmOI4 |
| `atelier/atelier-1-golden-warp-threads-loom.webp` | 2400x1600 | 350 KB | [Esha Verma](https://unsplash.com/photos/close-up-of-hanging-golden-threads-on-a-loom-LeYd0uXln3I) | https://unsplash.com/photos/close-up-of-hanging-golden-threads-on-a-loom-LeYd0uXln3I |
| `atelier/atelier-2-stacked-patterned-textiles.webp` | 1800x1013 | 254 KB | [Sounak Mukherjee](https://unsplash.com/photos/colorful-patterned-textiles-and-scarves-stacked-for-sale-bsxCeDUuprM) | https://unsplash.com/photos/colorful-patterned-textiles-and-scarves-stacked-for-sale-bsxCeDUuprM |
| `atelier/atelier-3-weavers-hands-loom.webp` | 2400x1600 | 174 KB | [Esha Verma](https://unsplash.com/photos/weavers-hands-creating-a-colorful-rug--JaQ5KsK8_Q) | https://unsplash.com/photos/weavers-hands-creating-a-colorful-rug--JaQ5KsK8_Q |

## Where each one is wired

| Key / consumer | Points at |
| --- | --- |
| `siteCopy.home.hero.desktopImage` | `hero/hero-black-silk-drape.webp` |
| `siteCopy.home.recommended.bestSellers[0..3].image` | `mostrec/mostrec-1..4-*.webp` |
| `siteCopy.home.collection[0..3].image` / `.backImage` | `collection/collection-N-front-*` / `collection-N-back-*` |
| `siteCopy.home.style.items[0..3].frontImage` / `.backImage` | `style/style-N-front-*` / `style-N-back-*` |
| `GET /api/slideshow` (the Atelier movement) | lists `public/slideshow/*`, then `samples/atelier/*` |

The original files in `public/collection/`, `public/mostrec/`, `public/shop by style/`,
`public/slideshow/` and `public/mocks/` are untouched.

## Hero brief this satisfies

No text, no logo, 3200px wide (>= 2400), a dark calm field with no focal point so it survives
`object-cover` at both 1440x900 and 3000x400. Subject: black silk drape, shot on a Nikon D750.
