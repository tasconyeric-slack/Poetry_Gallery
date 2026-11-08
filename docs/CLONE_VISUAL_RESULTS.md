# Visual results — 2026-11-08

Implementation screenshots are tracked in `docs/evidence/` (public-domain examples or synthetic test data only). Reference originals and side-by-side source/implementation/difference boards are local ignored `.reference/{gallery,reader,writer,library,collections,card}-comparison.png`. Exact official image URLs/digests are in native-reference-manifest.json. Difference images and machine-readable metrics are tracked; no third-party original is committed.

## Actual iterations

1. Initial screenshots exposed an oversized tools area before the first Explore card, legacy paper borders, metadata in focused writing, narrow-screen filter overflow and stale scroll positions. Adjusted structure, paper geometry, focus state, filter containment and route scroll reset. Browser screenshots were rerun after fixes.
2. Card row detection measured source rows68–109/127–167/186–227 versus initial implementation68–100/121–154/177–207 (552px width). Increased Kai font62→79 export pixels and row stride88→96.2, changed column stride106→111, matched traditional public-domain source text and author. Mean absolute RGB difference4.980→3.823; pixels with any RGB channel delta>20:3.907%→3.424%. Seal intentionally reads 诗, not the reference product's 窗.
3. Focused writing removed metadata and toolbar chrome; all three viewport checks and actual image downloads reran successfully.

[Current metrics](evidence/visual-metrics.json), [initial metrics](evidence/visual-metrics-iteration1.json). Initial whole-page structural scores used height resizing; current structural comparison correctly preserves width scale and crops the viewport. Only matched card scores are comparable across these runs. Different-language prose and different chrome make the other whole-screen scores diagnostic, not fidelity percentages.

REA `compare_web_screenshots` ev_9cfb4ba714b24f16e11b15214f8e7085cf6d37fc785a0e3e80260c184e026891 independently confirms matched card changed15461/451536 pixels (3.42409%), threshold20. REA channel mean2.86713 includes opaque alpha; Pillow RGB-only mean3.823. Both report **different**, not pixel-identical. [REA result](evidence/rea-card-comparison.json).

## Screenshots

| Screen | Mobile | Desktop |
|---|---|---|
| Explore | [390](evidence/gallery-390.png) | [1440](evidence/gallery-1440.png) |
| Read | [390](evidence/reader-390.png) | [1440](evidence/reader-1440.png) |
| Focus writer | [390](evidence/writer-390.png) | [1440](evidence/writer-1440.png) |
| My poems | [390](evidence/library-390.png) | [1440](evidence/library-1440.png) |
| Collections | [populated390](evidence/collection-populated-390.png) | [populated1440](evidence/collection-populated-1440.png) |
| Collection detail | [390](evidence/collection-detail-functional-390.png) | adaptive |
| Card composer | [390](evidence/composer-seal-390.png) | [PNG](evidence/card-seal.png) |

## Remaining material deviations / limits

Localized gallery titles/excerpts, different-length reading examples, additional web controls and browser typography remain visibly different. Native private-tab and collection-detail/order screens are unavailable; those layouts are inferred. Library baseline screenshots intentionally show an empty device, while separate populated functional captures demonstrate real work. Only one 西窗烛 card design is directly evidenced; other themes are adaptations. No iOS/Android runtime or true WeChat device test was performed. This is a runnable reconstruction with documented visual differences, **not a demonstrated pixel-perfect reproduction of every screen**.
