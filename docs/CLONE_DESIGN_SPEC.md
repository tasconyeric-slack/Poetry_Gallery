# Design specification

Native reference regions are normalized by width, then top-cropped; no device frame/status bar is treated as application UI. Desktop is an adaptive extension rather than an observed native desktop product.

`rebuild.css` owns shared tokens: paper #faf7ef, ink #1d1b30, terracotta #ba8a66, muted #a19e91, line #e3dfd5. PoPoem-owned screens override to white/grey. Serif poetry uses Georgia and available Songti/SimSun; native Kai-style cards use KaiTi/STKaiti. Browser/iOS font metrics remain different.

- Explore: 20px mobile gutters, rounded18px poem panels, navy first panel, cream alternating panels, rounded taxonomy pills, thin accent tab indicator. Primary anchors: first navy panel; two-line title/excerpt/author spacing.
- Reader: borderless warm canvas, centered title25px/body22px, restrained author, previous/next and typography controls, fixed84px bottom navigation. Long text wraps and scrolls, never clipped to a viewport.
- Writer: PoPoem top row private/save, centered write, publish; borderless title/body on white. Focus mode removes library, metadata and bottom chrome. Normal mode exposes all existing history/cover/import/cloud controls. Primary anchors: top action row; title/body inset.
- Library: square64px avatar glyph, profile introduction, poetry/collection/favorites/private tabs, white rounded rows on pale grey. No fictional identity/counters/social feed. Search/status/genre/year/sort remain functional extensions.
- Collection list: white vertical rows,73px square covers, title18px and muted author/count beneath. Editor/detail/reorder are inferred, documented extensions; no claim of native equality.
- Native card: white900×1334 export; right-to-left vertical columns,79px KaiTi,96.2px row stride,111px column stride, left-bottom author and red site seal. Exactly compared against source552×818 after normalization. Square and longer works use horizontal composition; excess content explicitly directs to complete PDF/link.

No framework migration was needed to make these layouts. Existing DOM contracts preserve capability auth, stable UUIDs, history and public hash links. Styles are loaded after legacy resources. No remote font service or paid dependency added.
