# Native screenshot reference evidence

Acquired 2026-11-08 through Apple's public iTunes Lookup API. These are official developer-published App Store promotional composites containing app UI, **not live native app captures**. Cropping removes marketing captions, device frame and platform status chrome; native control behavior remains unobserved. No Android APK, ADB device or JADX evidence was acquired; no Android reverse engineering is claimed.

## Identity and provenance

| Product | Official listing | Metadata | Version observed | Local originals |
|---|---|---|---|---|
| PoPoem | https://apps.apple.com/cn/app/id1363152302 | https://itunes.apple.com/lookup?id=1363152302&country=cn | 6.1 | `.reference/popoem-{1..10}.jpg`, 1168×2532 |
| 西窗烛 | https://apps.apple.com/cn/app/id912139104 | https://itunes.apple.com/lookup?id=912139104&country=cn | 8.4.1 | `.reference/xcz-{1..9}.png`, 1170×2080 |
| Poema | https://apps.apple.com/us/app/id6789758960 | https://itunes.apple.com/lookup?id=6789758960&country=us | 1.0.6 | `.reference/poema-store-{1..5}.jpg`, 1170×2532 |

Metadata JSON preserves exact `screenshotUrls` and all original CDN URLs in `.reference/{popoem,xcz,poema}-itunes.json`. Images requested at `1170x2532bb` size from the exact Apple CDN paths; aspect ratio is preserved by Apple. Acquisition script `.reference/acquire-native.mjs`; normalization `.reference/crop-native.py`. All third-party assets remain untracked local reference material.

## Observed screens and canonical usage

- Poema #5 (`05_WriteEditorView.1.png` in CDN path) is a genuine editor screen embedded in a promotional image: warm cream paper, Cancel on left, Save Draft / character count / thin outlined Publish on right, italic daily prompt followed by hairline, italic title placeholder with another hairline, plain borderless body. Available alternate writer reference; final implementation chooses PoPoem #3 for writing; no editor behavior inferred from pixels. `.reference/poema-store-5-crop.png` removes device and header.
- Poema #4 (`04_PoemVisualizeSheet.1.png`) is the print-card composer: tall preview centered, horizontal thumbnail strip underneath, solid terracotta export button and outlined link-share button; screenshot includes account quota, which the rebuild need not reproduce. `.reference/poema-store-4-crop.png`.
- PoPoem #5 is profile/private-library entry point. White profile area, square photo left, totals right, title and grey intro, horizontal 诗文 / 诗集 / 藏诗 / 私存 tabs, thin grey selected underline. Below: pale grey canvas, white rounded poem panel, serif title/body, light-grey author/date. `.reference/popoem-library-crop.png`.
- PoPoem #3 is an alternate writer reference, chosen as the final canonical writer (Poema is an alternate only): centered 写诗 title, 私存 left/发表 right, white sheet, borderless inputs and grey rounded #诗集 pill. `.reference/popoem-writer-crop.png`.
- PoPoem #6 has white poem-preview card and font-size choices 小 / 中(默认) / 大 / 特大. #7 color settings and #9 settings show real customization and export-public/export-draft controls. `.reference/popoem-font-crop.png`.
- 西窗烛 #3 is canonical vertical poem card: white portrait paper, two black vertical poem columns at upper right, vertical author at lower left followed by red square seal. Pale lavender-grey app background and generous margins. `.reference/xcz-card-crop.png` is card paper only, 552×818.
- 西窗烛 #1 is centered poem title, author below, body in horizontal paired clauses. #7 is collection-list reference: white rows divided by pale rules, square cover left, title right with smaller grey author/count. `.reference/xcz-reader-crop.png` and `.reference/xcz-library-crop.png`.

## Explicit coverage gaps

PoPoem screenshot #5 shows the tabs but does not reveal the selected 私存 list, the 诗集 list/detail, or reordering screen. Their implementation must be marked inferred from visible profile and collection controls. 西窗烛 #3 shows one vertical card only; additional photo/other card designs are product adaptations, not verified native screens. Poema screenshots prove static editor and composer structure, not autosave/revision implementation. No native runtime interactions or storage mechanisms were observed.

## Crop coordinates (source pixel, right/bottom exclusive)

| Output | Source | x0,y0,x1,y1 |
|---|---|---|
| popoem-writer-crop.png | popoem-3.jpg | 140,560,1028,2350 |
| popoem-library-crop.png | popoem-5.jpg | 140,550,1028,2350 |
| popoem-font-crop.png | popoem-6.jpg | 140,580,1028,2350 |
| xcz-card-crop.png | xcz-3.png | 308,776,860,1594 |
| xcz-library-crop.png | xcz-7.png | 240,590,930,1788 |
| xcz-reader-crop.png | xcz-1.png | 240,590,930,1788 |
| poema-store-5-crop.png | poema-store-5.jpg | 180,770,990,2390 |
| poema-store-4-crop.png | poema-store-4.jpg | 180,770,990,2390 |

These are manually selected normalization regions, not exact device viewport identities. Do not report whole-image pixel equality against differently sized/localized app states. Compare matched anchor crops and acknowledge iOS-vs-browser font rasterization.
