# NEXT TASK — Poetry Gallery ONLY

Work ONLY in tasconyeric-slack/Poetry_Gallery, existing feat/poetry-publishing-mvp branch and PR #1 (https://github.com/tasconyeric-slack/Poetry_Gallery/pull/1). Vercel project is existing tasconyeric-slack/shici-archive; domain shici.byliyz.com is already connected. No other repositories, Vercel projects, Supabase projects or databases are in scope.

Owner's current decision: abandon Tencent SMS due to the absence of enterprise qualification. Future owner login is Passkey (WebAuthn) with securely restricted first-owner enrollment and recovery. DO NOT leave a temporary unsecured admin route, do not use email OTP, and do not ask for a phone number. Owner specifically requests progress on non-login features first.

Existing independent Cloudflare D1 poetry-gallery-d1 and Worker poetry-gallery-api remain in use. The deployed public Worker exposes published poems/cover only and admin mutations must remain locked. Public browser should read Workers.dev directly, not wait for Vercel environment variables. Preserve classical demo labeling, mobile search, sharing and print. Improve accessibility and responsive checks.

Release 1 implements additive author metadata, explicit empty/offline/demo states, cold detail links, mobile typography, local PNG sharing, browser PDF and private JSON import. Import workflow and checks are in README.md. Real owner-approved content remains pending; never seed remote test content. No fabricated family poems. Do not claim owner CRUD works until Passkey implementation and verification are actually complete.

Do not start over, do not create duplicate branch/PR, and do not merge to main without owner approval.
Passkey device compatibility must be checked in the actual WeChat in-app browser; if unavailable, explicitly offer Safari/Chrome for the owner. Do not enable passwordless account registration to work around embedded-browser limitations.
