# Poetry Gallery production delivery — 2026-11-06 (America/New_York)

## Released

Owner explicitly approved production migration, Worker deployment, PR merge, credential generation/setup and production write acceptance in this chat.

- Integrated PR #17 merged: https://github.com/tasconyeric-slack/Poetry_Gallery/pull/17
- Application merge SHA: e3ca89784294ea190de02caaab82d99e54588c6b; tested source SHA: 172809007dc664b862ede38099451f6fcf54dd02.
- Session B PR #18 is incorporated with original authorship preserved; do not independently duplicate its patch.
- Vercel existing shici-archive production deployment dpl_CkhZUbWWsYVYYUHX66EfdF2DaDJk is READY at the application merge SHA. https://shici.byliyz.com/ serves the integrated release.
- Existing Cloudflare poetry-gallery-api active version 86417471-0ee4-4133-98a0-505c84eca5c6 serves 100% of traffic. It includes the integrated Worker source and the final credential rotation.
- Existing D1 poetry-gallery-d1 (6f92588b-0a92-41c6-ad43-ae014f6112fe), account e74c8ea09a39180378061cae256cd87e: 0001, 0002 and 0003 recorded in d1_migrations. Only existing forward 0003 was applied via the authenticated Cloudflare API; no database rebuild or reset.
- POETRY_OWNER_TOKEN is configured with 256 bits of cryptographic randomness. GATEWAY_KEY, OTP_PEPPER and OWNER_PHONE remain present and unchanged. No DNS/new resources/paid dependencies/video development.

## Acceptance evidence

CI on tested source passed: https://github.com/tasconyeric-slack/Poetry_Gallery/actions/runs/42298036104

Seven non-video Node suites pass. Actual Wrangler 4.158.0 workerd/local D1 passed migration 0001–0003, repeat migration skip, cloud regression and both 375px browser suites. Worker packaging dry-run passed.

Production HTTP acceptance passed: owner session; create private draft; repeat identical localId returns the same ID; reload exact text; edit with predecessor history; reject stale version with 409; upload a real generated JPEG with version increment; deny draft public reads; publish and anonymously read detail/cover; restore historical content/cover state; withdraw and return anonymous 404; reject anonymous private reads and writes with 403; export complete private backup and recover locally.

Real Chromium at 375px on https://shici.byliyz.com/#admin passed author unlock, actual browser CORS/direct Worker access, private saved-work reopen and content persistence. Credential input is cleared after unlock and credential is absent from localStorage. Same-origin /api/config returns configured:true.

The local recovery file was checked against the production backup: all poem fields match exactly, revision/cover counts match, and cover base64 bytes match. Production fixture remains private:
- poem ID b587b461-3d1a-45a2-91b7-e138bcbe40a8
- title [系统验收·合成作品] 云端存档测试
- status draft, version 5; 4 predecessor revisions, 1 retained historical cover
- clearly marked synthetic system acceptance, not a family poem; no production deletions.

WeChat native webview/long-press/system-share still needs a real-device check. Browser PNG/copy/cancel paths passed the local integrated suites.

## Backup and recovery

Pre-migration complete production SQL export is in ignored original workspace Poetry_Gallery/private/pre-cloud-fix.backup.sql. SHA256 9b124577cf9941851766ea1114106b05a9ee21d406a37d107df13bc646ee1ba0. Bookmark 00000020-00000000-0000511b-ee319a84693b125236a4419d4c56a0d9. It was restored locally, unchanged 0003 applied and SQLite integrity_check passed. The production schema/count was rechecked immediately before migration and matched this backup (0 works, 0001/0002).

Post-acceptance backup and recovered SQLite are in ignored Poetry_Cloud_Delivery/private/production-acceptance.private.json and private/production-acceptance-recovery.sqlite. Never commit private exports.

Complete archive recovery is local-only and transactional:
```bash
node scripts/restore-archive.mjs private/archive.private.json --local private/recovery.sqlite
```
It refuses existing IDs, invalid versions and missing current/historical covers. Review a recovery file before any separately approved production restoration.

## Credential handoff and future changes

The final owner capability was delivered to the owner's local clipboard, not a repository file, URL or localStorage. One initial browser automation error included its input value; that initial capability was invalidated immediately. The replacement used RSA-OAEP public-key encryption for transport from Cloudflare into the local process, which decrypted only in memory and set the clipboard. The final credential never appeared in tool output or chat. The production browser recheck used the replacement successfully.

Store the final clipboard value in a password manager and paste it into the website's cloud-unlock field. Refresh/sign-out clears browser authorization. Do not use the superseded initial value. No CLI login or secret entry is needed for this completed release.

Future rotation (repository root, interactive hidden prompt):
```bash
npx wrangler@4.158.0 secret put POETRY_OWNER_TOKEN --name poetry-gallery-api
```
This immediately deploys a Worker version. Preserve other Secrets. Future migrations require local validation, name/UUID/schema checks, a verified backup and explicit owner approval. No synthetic production writes or deletion without authorization.

The direct Worker is the canonical backend; /api/poetry forwards only the caller's Authorization to that same backend. No Vercel gateway environment setup is required.
