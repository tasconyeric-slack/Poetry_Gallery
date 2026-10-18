# 诗词馆 · Poetry Gallery

Only repository: https://github.com/tasconyeric-slack/Poetry_Gallery
Existing Vercel project: https://vercel.com/tasconyeric-slack/shici-archive
Custom domain (ALREADY LINKED): https://shici.byliyz.com/

Mobile-first family poetry archive: public published poems, private owner drafts, print and share. The owner uses phone SMS verification and receives a secure HttpOnly 60-day session cookie, not email/password.

## Architecture — NO Supabase

- Static site + Vercel same-origin API gateway: api/poetry.js
- Dedicated Cloudflare Worker: worker/index.js
- Dedicated Cloudflare D1 database: poetry-gallery-d1, DB binding, UUID 6f92588b-0a92-41c6-ad43-ae014f6112fe
- Tencent Cloud SMS gateway: six-digit code, valid 5 minutes; 60-second cooldown, maximum 5 SMS/day, 6 attempts/code
- Covers compressed client-side to JPEG under 550 KB, stored privately in D1. The picture endpoint only returns a published poem cover or an owner's own session. R2 is intentionally not required.
- Without backend, site remains a clearly marked classical-poetry DEMO. The owner's real poems are never fabricated or imported.

D1 is serverless; no database keepalive task. Do not use or alter any existing Supabase resources.

## One-time setup

### 1. Cloudflare Worker

A brand-new Poetry Gallery D1 database was created, with the initial tables successfully applied. No other databases were touched.

In this exact repository, deploy using Wrangler (after authorizing the account that owns poetry-gallery-d1):

    npx wrangler@4 deploy

Wrangler configuration is committed in wrangler.toml and automatically binds DB. If needed to record/synchronize the migration, run:

    npx wrangler@4 d1 migrations apply poetry-gallery-d1 --remote

Configure the following Cloudflare Worker Secrets in the dedicated poetry-gallery-api Worker. NEVER put these values into GitHub files or screenshots:

- GATEWAY_KEY: random secret of at least 32 bytes; must EXACTLY equal Vercel POETRY_GATEWAY_KEY
- OWNER_PHONE: only authorized phone number with country prefix, e.g. +8613800000000 (example only)
- OTP_PEPPER: another independent random secret of at least 32 bytes
- TENCENT_SECRET_ID: Tencent Cloud API SecretId for the SMS service
- TENCENT_SECRET_KEY: Tencent Cloud API SecretKey for the SMS service
- TENCENT_SMS_APP_ID: SMS SDK AppID
- TENCENT_SMS_SIGN: approved SMS signature
- TENCENT_SMS_TEMPLATE: approved verification template ID, with 2 parameters: verification code and expiration minutes (5)

Where: Cloudflare Dashboard → Workers & Pages → poetry-gallery-api → Settings → Variables and Secrets → Add (type Secret). Alternatively use Wrangler: npx wrangler@4 secret put GATEWAY_KEY (repeat per secret).

China SMS requires Tencent Cloud verification/signature/template qualification and prepaid credits. If you do not have a qualifying SMS account, real SMS login remains BLOCKED; do not fake it. Do NOT create a phone-based login without rate-limiting or send OTP to arbitrary numbers.

After deployment, record its ACTUAL workers.dev URL from Cloudflare; do not guess the account's subdomain.

### 2. Existing Vercel project only

Go to https://vercel.com/tasconyeric-slack/shici-archive/settings/environment-variables

Add TWO SERVER-SIDE environment variables for Preview and Production:

Name: POETRY_WORKER_URL
Value: Exact deployed Cloudflare poetry-gallery-api worker URL, starting with https:// and ending in workers.dev or its verified host.

Name: POETRY_GATEWAY_KEY
Value: The exact same random secret as Cloudflare Worker GATEWAY_KEY.

They are NOT PUBLIC browser variables. Do NOT use NEXT_PUBLIC_, VITE_, SUPABASE_, or expose the SMS secrets. The browser's /api/config response contains only whether the backend is configured; the Vercel gateway privately calls the Worker.

Save, then redeploy the Vercel Preview branch to apply the environment variables. The domain shici.byliyz.com is ALREADY linked: do not change DNS/domain/project. Production stays on main until explicit owner approval.

### 3. Test (NOT YET VERIFIED)

1. /api/config shows configured:true after both Vercel variables are present.
2. Authorized phone receives an SMS, wrong numbers/codes denied, sessions last across refresh, logout works.
3. Draft saves, reloads and stays invisible to strangers; edit, publish and share a link; unpublish and verify anonymous detail disappears.
4. Anonymous POST mutation is denied; private cover returns 404; published image displays.
5. WeChat browser, 375px mobile, desktop, share fallback and PDF print tested.
6. Verify GitHub Actions and the Preview HTTP endpoint before marking C2/C3 complete.

## Commands

    node --check app.js
    node --check cms.js
    node --check api/config.js
    node --check api/poetry.js
    node --check worker/index.js
    node scripts/smoke.mjs
    node scripts/mvp-check.mjs
    node scripts/config.test.mjs

For unconfigured static-only demo: python3 -m http.server 8000.

## Limitations

China mainland domestic SMS is a regulated paid service, requiring provider approval; it cannot be guaranteed for unverified personal accounts. R2 is inactive; covers are compressed to fit D1 row limits. Signing in on a new device or after 60 days requires another SMS; there is no unnecessary recurring keepalive requirement.
