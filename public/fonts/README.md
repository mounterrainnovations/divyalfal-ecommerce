# Self-hosted fonts

Both families are OFL 1.1. Full licence texts sit beside the font files
(`OFL-Fraunces.txt`, `OFL-Jost.txt`) as the licence requires. The woff2 files are
unicode-range subsets (latin, latin-ext) of the upstream variable fonts, produced by the
Google Fonts CSS API; each retains its `fvar`/`gvar`/`avar` tables, so the axes below are
live at runtime. Nothing is fetched from a font CDN at runtime — see `app/globals.css`.

| File | Family | Axes | Subset | Bytes |
| --- | --- | --- | --- | --- |
| `fraunces-var-latin.woff2` | Fraunces | `opsz` 9–144, `wght` 300–400 | latin | 66,504 |
| `fraunces-var-latin-ext.woff2` | Fraunces | `opsz` 9–144, `wght` 300–400 | latin-ext | 96,524 |
| `jost-var-latin.woff2` | Jost | `wght` 300–600 | latin | 26,576 |
| `jost-var-latin-ext.woff2` | Jost | `wght` 300–600 | latin-ext | 17,104 |

Upstream (for a future refresh, not a runtime dependency):
`css2?family=Fraunces:opsz,wght@9..144,300..400` and `css2?family=Jost:wght@300..600`.
