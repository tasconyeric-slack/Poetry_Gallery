# Issue 21 — canonical references

Acquired 2026-11-08. Third-party originals and side-by-side comparisons stay ignored under `.reference/`; the official source URLs and SHA256 identities are in [manifest](native-reference-manifest.json). [Native evidence](native-reference-evidence.md) records exact crops/version/coverage.

| Target | ONE primary visual reference | Actual screenshot | Secondary functionality / boundaries |
|---|---|---|---|
| Home/gallery `#gallery` | Poema Explore | https://poema.kiloforge.com/shots/explore-all.webp | Chinese taxonomy/localized text; private favorites device-only |
| Reading `#poem/:id` | Poema full-screen reader | https://poema.kiloforge.com/shots/reader-airport-bar.webp | PoPoem typography preferences; web sharing controls additional |
| Writing `#admin`, focus mode | PoPoem writer, screenshot #3 | `.reference/popoem-writer-crop.png`; Apple ID1363152302 | Poema autosave/revision behavior is described publicly; existing versioned Worker is implementation |
| My poems `#library` | PoPoem profile, screenshot #5 | `.reference/popoem-library-crop.png`; Apple ID1363152302 | No invented social counts; private-tab content itself not visible in reference |
| Collections `#collections` | 西窗烛 list, screenshot #7 | `.reference/xcz-library-crop.png`; Apple ID912139104 | Multiple membership/order from Issue; detail/edit are inferred functional extensions |
| Poem card | 西窗烛 vertical card, screenshot #3 | `.reference/xcz-card-crop.png`; Apple ID912139104 | Poema composer screenshot #4 informs preview/export interaction only; two other themes are adaptations |

Poema public website is marketing, not a web editor. Official App Store screenshots contain real app UI embedded in marketing composites; cropped regions are static visual evidence, not captured native execution. No Android package/device was obtained; no APK/JADX analysis is claimed.

REA actually used: `list_browser_targets` ev_48ce0e2553c155f570eba1f3949d54bf883788c3b28c3bf131598518c066844f; `inspect_web_page` ev_c512d4e2762aa5854846dfd20e7fb256ea15e0a38a3dcfc9d8ef2d859142631a (532 DOM nodes,16 scripts, resource inventory and script sources); `capture_web_screenshot` ev_c7279accd67288f051984eb15413634cae2f5844c19fe7645963950b083b48a1. Passive scope cannot prove prior network/interaction behavior. Controlled navigation/screenshots/downloads were driven separately with Playwright. Sanitized local inventory `.reference/rea-poema-evidence.json`.

Playwright also opened the real site's `Is there a web version?` FAQ. The revealed answer confirms that reading is currently iPhone-only and the website is the public web presence. Local interaction screenshot/text: `.reference/poema-faq-open.png`, `.reference/poema-faq-interaction.txt`. This was an observed FAQ transition, not a claim of running the native editor.
