# 诗词馆 · Poetry Gallery

**Only repository:** https://github.com/tasconyeric-slack/Poetry_Gallery
**Existing Vercel project:** https://vercel.com/tasconyeric-slack/shici-archive
**Already-linked website:** https://shici.byliyz.com/

Poetry Gallery is a mobile-first Chinese family poetry archive. Visitors can browse and search published poems, read deep links, view published cover images, share poems, and print an anthology. Unpublished works and cover files remain private. No poems are attributed to family members unless actually published by the owner.

## System and status

- Existing Vercel static website (no new project or custom-domain changes).
- Independent Cloudflare D1 database: poetry-gallery-d1, bound to Cloudflare Worker poetry-gallery-api.
- Public read-only Worker: https://poetry-gallery-api.tasconyeric.workers.dev/
- Public API: GET /?op=health, GET /?op=list, GET /?op=detail&id=UUID, GET /?op=cover&id=UUID.
- Public GETs require no accounts, Vercel environment variables, SMS credentials, or keepalive.
- The gallery distinguishes loading, empty archive and unavailable API states. Readers can explicitly open labeled classical examples.
- Admin editor source includes create, edit, draft, publish, unpublish, delete and compressed private JPEG upload. **It is deliberately LOCKED until Passkey authentication is safely implemented and verified.**

## Authentication: design chosen, implementation deferred

Use WebAuthn Passkeys (phone fingerprint / Face ID / device unlock) for the single owner, with restricted first-device enrollment and an offline recovery mechanism. Passkey enrollment cannot be open to anonymous callers. Use a reviewed WebAuthn verification library, with RP ID shici.byliyz.com. No email OTP, Tencent SMS, Supabase, phone-number verification, or provider qualification is required.

Owner mutation routes stay protected by the Vercel same-origin gateway and Worker server-side checks. Do not enable ADMIN_AUTH_ENABLED or add unverified bootstrap endpoints until registration, challenge verification, recovery, session issuance and threat-model tests are complete. There is **no active login** right now.

## Existing infrastructure

D1 database: poetry-gallery-d1, UUID 6f92588b-0a92-41c6-ad43-ae014f6112fe.
Worker: poetry-gallery-api, domain https://poetry-gallery-api.tasconyeric.workers.dev.
worker/index.js and wrangler.toml track the deployable Worker and its one dedicated D1 binding.
To publish changes with a reviewed authorized Cloudflare account: npx wrangler@4 deploy.

The existing Vercel domain is already configured. Do NOT change its DNS settings. **No Vercel environment variables are required for public reading.** When Passkey login is ready, the existing Vercel project will need the server-only POETRY_WORKER_URL and POETRY_GATEWAY_KEY variables; never expose them as browser variables.

## Check / acceptance

Commands:
    node --check app.js
    node --check cms.js
    node --check worker/index.js
    node scripts/smoke.mjs
    node scripts/mvp-check.mjs
    node scripts/worker.test.mjs
    node scripts/config.test.mjs

Tests cover public responses, draft exclusion, private cover denial, anonymous write denial and CORS, but the owner CRUD flow is not live-tested until authentication is implemented. Verify mobile at 375px, actual WeChat sharing and print behavior in browsers separately.

Never touch other projects, Vercel deployments, Supabase databases, or unrelated Cloudflare resources. Work stays on feature branch feat/poetry-publishing-mvp / draft PR #1; do not merge without owner approval.
## Full owner backup (after Passkey is enabled)

The locked owner workspace includes an export button. It downloads a JSON snapshot with poem text, drafts, timestamps and compressed cover bytes. The Worker backup endpoint requires the owner session and server-side gateway key; it is never anonymous. Keep downloaded backups private. Restoring data remains a separately reviewed future feature.

## WeChat-friendly poem image

Each poem detail includes **生成分享诗卡**. The browser draws a full Chinese poetry card locally on a Canvas and shows a PNG preview that readers can long-press to save and send in WeChat. This does not use a paid API or upload the artwork. Very long poems are directed to link sharing or printable PDF instead of being silently truncated.

## Passkeys inside WeChat

WebAuthn/Passkey availability varies by embedded browser, device and OS. Admin onboarding and login must be verified in the actual target WeChat webview. If unsupported, guide the owner to open shici.byliyz.com in Safari or Chrome for authentication. Do not pretend that all WeChat versions support passkeys. Public reading/sharing remains available in WeChat without logging in.

## Release 1: private JSON import (Node 24+, Windows PowerShell)

Real content is pending. Production D1 is intentionally empty. Do not apply the test template remotely.
Keep owner-approved UTF-8 JSON and SQL outside git, e.g. `private/poems.private.json` (ignored).
Copy `examples/poems.template.json` there and replace every test field. Generate a fresh UUID once per work
with `[guid]::NewGuid()`; retain that ID on subsequent edits. Status must explicitly be `draft` or `published`.
Author is optional; absent author displays 作者未署名. Text line breaks and stanza breaks are preserved.
Covers are not imported; existing cover references survive updates.

```powershell
# Validate only (default); prints count, never poem text.
node scripts/import-poems.mjs private/poems.private.json
# Optional private SQL artifact, refuses to overwrite an existing file.
node scripts/import-poems.mjs private/poems.private.json --sql private/import.private.sql
# Local schema and local-only fixture exercise:
npx --yes wrangler@4 d1 migrations apply poetry-gallery-d1 --local
node scripts/import-poems.mjs private/poems.private.json --apply --local
node scripts/import-poems.test.mjs
# Before authorized real import, save an owner-only database backup OUTSIDE git:
npx --yes wrangler@4 d1 export poetry-gallery-d1 --remote --output private/before.backup.sql
npx --yes wrangler@4 d1 migrations apply poetry-gallery-d1 --remote
# Only after reviewing actual owner-approved status values:
node scripts/import-poems.mjs private/poems.private.json --apply --remote --confirm
# Read-only counts; does not disclose text:
npx --yes wrangler@4 d1 execute poetry-gallery-d1 --remote --command "SELECT status, COUNT(*) AS count FROM poems GROUP BY status"
```

Migration 0002 adds nullable `author`; never reapply it manually after Wrangler records it.
Upserts retain IDs, created dates, existing covers and original publication date. Changed fields update
only that ID; draft status removes public access. Omitted records are untouched. SQL literals are escaped.
Wrangler requires authorized local Cloudflare credentials. No web login or public write endpoint is enabled.
If an import needs undoing, stop further imports and review the private backup against affected IDs;
restore only those records, preserving unrelated data. Do not blindly replay a full export over live tables.
Never commit backups, SQL artifacts or real unpublished text.

Final local checks include `node scripts/import-poems.test.mjs` in addition to the existing checks.
Public release is via PR #1; merge to main only after owner approval. Existing Vercel Git integration
then publishes shici-archive. Worker deployments and additive migrations use the existing named resources.
