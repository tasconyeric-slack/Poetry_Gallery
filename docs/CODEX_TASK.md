# IMPLEMENTATION HANDOFF — Poetry Gallery ONLY

Current repository: tasconyeric-slack/Poetry_Gallery.
Continue the EXISTING feat/poetry-publishing-mvp branch and PR https://github.com/tasconyeric-slack/Poetry_Gallery/pull/1.
Existing Vercel project: tasconyeric-slack/shici-archive.
Already-linked custom domain: https://shici.byliyz.com/ (do not change DNS/project settings).

## Owner decisions (2026-10-18)

NO Supabase and no keepalive. Use independently provisioned Cloudflare D1 poetry-gallery-d1 with Cloudflare Worker poetry-gallery-api.
Owner login: mobile SMS, single authorized phone + secure 60-day session. No email or unauthorized WeChat login shortcuts.
Keep static HTML/CSS/JS and the EXISTING Vercel project. Do not merge without approval.

## Next work

The dedicated D1 database and its schema already exist. This PR now includes D1 Worker backend, Vercel same-origin gateway, SMS interface, image storage, print/share and tests. Review/verify CURRENT CODE instead of starting another branch or planning cycle. Read README exact setup.
Deploy Worker only into the account owning poetry-gallery-d1 and set confidential Worker secrets (including SMS provider credentials). Vercel environment variables are SERVER-ONLY POETRY_WORKER_URL and POETRY_GATEWAY_KEY; setup must be in EXISTING shici-archive project. SMS provider qualifications and credentials are human-dependent.
Do actual permission/CRUD/SMS/UI tests. If blocked, label features untested, not done. Never touch unrelated repos/databases/domains.
