# Interaction and acceptance evidence

All writes tested with synthetic poems on loopback. No production poems were added/removed, no live schema or Secret changed.

| Path | Evidence / outcome |
|---|---|
| Create → device autosave → reload → switch drafts → cloud private save | `browser-ui-share.test.mjs` PASS at375px; stable localId and saving lock |
| Edit/version/revision restore, conditional cover upload | cloud-regression and d1-lifecycle PASS; actual local workerd/D1 PASS |
| Cover failure/retry/reopen | browser PASS; fixed missing version, file-input dirty flag and stale list closures |
| Publish → cold public hash link/reload → withdraw | browser PASS; public detail/cover404 after withdrawal |
| Same poem in2 collections → reorder → publish/filter → delete collection | `browser-collections.test.mjs` PASS; member works survive deletion |
| Full collection export | Browser verifies title+TOC+all bodies and invokes print/PDF; uses browser's Save as PDF dialog |
| Favorites, font size/theme persistence | visual-states browser PASS; device-local preferences |
|3 PNG themes, square/portrait, actual download | visual-states + browser-ui-share PASS; long60-line poem preserved and refuses clipped card |
| Clipboard/manual fallback/canceled native share | browser PASS; actual WeChat iOS/Android share sheet/long-press NOT device-tested |
| Server-rendered public previews `/p/:uuid` | share-preview unit PASS including withdrawn404, escaping, trusted cover origin and HEAD; Vercel rewrite not live-deployed |
| Responsive screens |5 canonical route states ×390×844,1440×900,360×800; no overflow/page errors |

Run: `node scripts/local-test-server.mjs`, then `node scripts/browser-ui-share.test.mjs`, `node scripts/browser-collections.test.mjs`, `node scripts/visual-states.test.mjs`. Install Playwright browser as CI workflow specifies. Python Pillow powers `python scripts/visual-diff.py` after official reference acquisition.

Actual local Wrangler evidence: [runtime log](evidence/local-worker-test.txt). The local SQLite adapter and real workerd are separately identified. Production completion is not inferred from either.
