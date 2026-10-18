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
- The gallery shows clearly labeled classical examples when no original work is published or when the archive is offline.
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