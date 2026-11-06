# Poetry Gallery · Release 2

Only repository: tasconyeric-slack/Poetry_Gallery. Existing Vercel project: shici-archive. Existing site: https://shici.byliyz.com. Existing Worker: poetry-gallery-api, D1: poetry-gallery-d1 (6f92588b-0a92-41c6-ad43-ae014f6112fe). Release 1 / PR #1 is merged. Release 2A is PR #15; video is a separate stacked PR. Neither is authorized to merge or deploy to production yet.

## Write, archive, publish

Tap **写一首诗**. Title, author, body (including blank stanza lines), genre, date and note have a live preview. Every input saves immediately on this device; reopen the page to continue. Device drafts are not cloud backups: clearing browser data loses them. Export device drafts regularly. Private content never enters the public gallery unless explicitly published.

Unlock with the owner's capability to save a private D1 draft, publish, reopen/edit, withdraw publication, upload a compressed JPEG, or delete (confirmation required). The capability stays only in JavaScript memory; refresh/sign out clears it. It never enters URLs, localStorage, source or logs. A missing secret fails closed with an explicit device-only message. All private GETs and all mutations require server-verified Bearer credentials. Public list/detail/cover expose only published poems.

Owner search matches title, body and author, with genre and creation-year filters. Committed changes capture the prior version atomically through a SQLite trigger; identical saves do not create revisions. Restoring a revision creates a new version and preserves the current version. Updates require the expected version; a conflict leaves device edits intact. Export them before reopening the cloud version to reconcile. Deleting a poem also deletes its history and covers, so export first.

## One-time owner setup and production release (owner approval required)

Do this from this repository only, after reviewing PR #15. No production migration, deployment or synthetic poem write was performed during development.

1. Generate a 256-bit token **locally** with a password manager (64 random hexadecimal characters). Store it securely; do not paste it into chat, GitHub, source files or environment files. If using PowerShell, generate it in a variable without printing it:

       $poetryBytes = [byte[]]::new(32)
       [System.Security.Cryptography.RandomNumberGenerator]::Fill($poetryBytes)
       $poetryToken = [Convert]::ToHexString($poetryBytes).ToLowerInvariant()
       Set-Clipboard -Value $poetryToken

2. Confirm wrangler.toml targets only poetry-gallery-api and poetry-gallery-d1. After approving release, run:

       npx wrangler@4 d1 migrations apply poetry-gallery-d1 --remote
       npx wrangler@4 secret put POETRY_OWNER_TOKEN
       npx wrangler@4 deploy

   Paste the token at the secret prompt, never as a command argument. Secret changes deploy immediately. Then unlock the site with the same token. Clear the clipboard and variable after securely storing it. Passkey replacement is deferred (#14).
3. Merge/release only after owner approval. Vercel's existing Git integration builds the site. No new Vercel project, DNS change or public browser environment variable is needed. Direct owner Worker requests allow only verified site origins https://shici.byliyz.com and https://shici-archive.vercel.app plus localhost:8080/8787. A preview origin requires an exact comma-separated OWNER_ORIGINS entry when explicitly approved; wildcard previews are not allowed. Preview frontend alone does not upgrade the deployed production Worker.

## Complete private backup and recovery

**导出完整备份** downloads poetry-gallery-backup-v2: all poems, author/date/status/version fields, revisions and inline cover bytes with a completeness label. Keep private. **导出本机草稿** separately preserves device edits, including edits that failed to sync.

Restore a complete cloud backup to a local SQLite recovery file only:

    node scripts/restore-archive.mjs private/archive.private.json --local private/recovery.sqlite

The recovery tool applies all forward migrations in a new local file, validates records, uses one transaction, and refuses collisions rather than overwriting works. It never connects to remote D1. Review the restored file before any separately authorized production recovery. Device exports are a different format: read/copy them back through the editor. The legacy scripts/import-poems.mjs remains for reviewed poem-array imports, not complete-history restoration.

## Sharing

Published detail links use #poem/UUID and work on cold open/refresh on the current origin. Native share, explicit copy and manual copy fallback are available. Vertical and square PNG cards render locally; long poems explicitly use vertical / PDF / original link instead of cropping. Long-press the PNG in WeChat to save. Print supports PDF and the published anthology. WeChat previews may use generic site metadata; per-poem OG previews are not claimed. Actual WeChat webview behavior still needs owner-device verification.

## Verification

Node 24+:

    node --check app.js
    node --check cms.js
    node --check worker/index.js
    node scripts/smoke.mjs
    node scripts/mvp-check.mjs
    node scripts/worker.test.mjs
    node scripts/config.test.mjs
    node scripts/import-poems.test.mjs
    node scripts/d1-lifecycle.test.mjs

Browser integration (requires `npm install --no-save playwright` and installed Chromium; set CHROME_PATH if needed):

    node scripts/local-test-server.mjs
    node scripts/browser-r2.test.mjs

The test server binds loopback only, uses synthetic in-memory SQLite and the actual Worker. It never contacts Cloudflare. Browser requests to the configured Worker are intercepted into this local server. Covers draft/publish/unpublish/revisions/recovery and unauthorized boundaries are tested locally. No remote write or production completion is claimed before an authorized live check. Screenshot artifacts are in ignored .qa/. No real family content is in fixtures.

## Lyric video studio (separate PR B)

Open **制作视频** on a poem or **用当前草稿制作视频** in the editor. The studio is dynamically loaded and works without cloud credentials. Choose paper/dark, 10–45 seconds, optional local image (8 MB) and optional owned audio/voice (30 MB). No photo/audio/video is uploaded or stored in D1.

A shared weighted timeline preserves verse/stanza boundaries with a title intro and outro, at 720×1280 and a 24fps capture target. Preview and export use the same renderer. Long poems explicitly require a separate excerpt rather than dropping text. Export happens in real time: keep the browser foregrounded; backgrounding cancels the current generation. A slow device may produce fewer frames. Use a supported desktop browser if a phone/webview cannot encode.

The browser probes actual MediaRecorder MIME support: MP4/H.264 (+AAC for audio) where supported, otherwise genuine WebM/VP9 or VP8 (+Opus). The downloaded extension follows the actual recording container; WebM is never renamed to MP4. Watch the generated video before downloading. Cancellation creates no new download. A prior downloaded file remains yours. Browser MediaRecorder WebM can have an indefinite metadata duration although playback has the selected real elapsed duration. Optional local conversion, if FFmpeg is installed: `ffmpeg -i poetry-lyric.webm -c:v libx264 -pix_fmt yuv420p -c:a aac poetry-lyric.mp4`.

Technical references: [MediaStream Recording specification](https://www.w3.org/TR/mediastream-recording/), [MediaRecorder format probing](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static), [Canvas capture](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream). No media library is bundled; native recording avoids an additional renderer dependency.

Local checks with the synthetic test server running:

    node scripts/video.test.mjs
    node scripts/browser-video.test.mjs

The browser test produces 10-second videos, checks container magic bytes, 720×1280 metadata and actual playback progress, optional synthetic audio, forced WebM fallback and cancel cleanup. Generated local evidence lives in ignored .qa/ and CI artifacts. Real WeChat/phone codec and system-share behavior still require owner-device verification. No production deployment or remote authoring test is claimed.

### Actual Cloudflare local D1 check

Also verified with Wrangler 4.158.0 / workerd local D1 (not just the Node SQLite adapter): apply `npx wrangler@4 d1 migrations apply poetry-gallery-d1 --local`, put a **synthetic test-only** token in ignored .dev.vars, and run `npx wrangler@4 dev --local --port 8787 --ip 127.0.0.1`. Start the static test server with POETRY_LOCAL_WORKER_URL=http://127.0.0.1:8787, then run browser-r2.test.mjs. This path forwards requests to the real local Worker/D1. Production resources remain untouched. `npx wrangler@4 deploy --dry-run` also passed.
