# Cloud archive release record — 2026-11-06

## Live observations (not inferred from old issues)

- Vercel existing `shici-archive` production deployment `dpl_C2BqLRe24EL666toTcSzTfPACgA8` is READY, main SHA `9d700433bf33b17956595eea1fcc250fdc0561f3`. Domain `shici.byliyz.com` remains attached. Frontend Git deployment does not upgrade the Worker.
- Worker active version `fed09972-f96d-458f-a159-0c6ff8d52edb` (100% traffic), Release 1. D1 binding targets the correct database ID below. Existing secrets are GATEWAY_KEY, OTP_PEPPER, OWNER_PHONE; POETRY_OWNER_TOKEN is absent. Existing unrelated secrets will be preserved.
- Account `e74c8ea09a39180378061cae256cd87e`, D1 `poetry-gallery-d1`, UUID `6f92588b-0a92-41c6-ad43-ae014f6112fe`, production. Poems = 0. `d1_migrations` records only 0001_poems.sql and 0002_author.sql. No version column or revision table/trigger exists.
- Historical schema drift: production poems.genre/status lack the source migration's defaults, and production covers accepts JPEG only (source permits more image types). All current Worker inserts supply genre/status and upload JPEG only; original 0003 applies without changing these historical constraints. No extra tables/columns or unrelated schema changes are proposed.

## Pre-migration backup and local evidence

A complete Cloudflare D1 SQL export was downloaded to ignored `Poetry_Gallery/private/pre-cloud-fix.backup.sql` (original workspace). SHA256 `9b124577cf9941851766ea1114106b05a9ee21d406a37d107df13bc646ee1ba0`. Bookmark `00000020-00000000-0000511b-ee319a84693b125236a4419d4c56a0d9`. The file includes schema and migration ledger; production contained no poems/covers/sessions. The export was restored to local SQLite, unchanged 0003 applied successfully and integrity_check returned ok. Never commit the SQL export.

Wrangler 4.158.0 local D1 applied 0001–0003 successfully; repeat apply reports no pending migrations. Actual workerd at loopback 8788 passed scripts/cloud-regression.test.mjs: token session, private create/read, stable localId retry, conflicting retry refusal, cover version increments/stale upload rejection, publish/public reads, historical cover restore, withdrawal/public detail and cover 404, unauthorized private reads/writes, complete backup to local recovery with revision/cover bytes, explicit confirmed versioned delete. All fixtures are synthetic and local. SQLite lifecycle, Worker boundary, gateway, import and gallery checks also pass. No remote poem writes/deletes or migration/deployment has been performed by Task A.

## Production commands requiring approval

Run only in the clean delivery checkout of this repository, after PR review and final schema/count recheck. No resource creation, DNS change, reset or seed/import step is involved.

```bash
npx wrangler@4.158.0 d1 info poetry-gallery-d1
npx wrangler@4.158.0 d1 migrations list poetry-gallery-d1 --remote
npx wrangler@4.158.0 d1 export poetry-gallery-d1 --remote --output private/pre-release.backup.sql
npx wrangler@4.158.0 d1 migrations apply poetry-gallery-d1 --remote
npx wrangler@4.158.0 deploy --keep-vars
```

The migration command applies only existing 0003: adds version with default 1, poem_revisions and atomic before-update trigger, then records migration completion. It changes no existing poem content and deletes nothing. Recheck database name/UUID/ledger and unexpected schema drift before executing; if anything changed, stop and refresh backup. Backup/migration may briefly interrupt DB availability. Deploy updates only existing poetry-gallery-api and preserves its unrelated secrets. The new Worker fails private access closed until Owner Secret is set.

The Cloudflare connector can perform the authorized operations without exposing cloud account credentials. Local Wrangler has no authenticated account in this environment; do not create a temporary account. If using the owner's Git Bash instead, `npx wrangler@4.158.0 login` establishes CLI authentication.

## Owner-only secret input

After approval, in Git Bash at the repository root:

```bash
cd /d/AAAMyDesktopFiles/2C_Workload/PoetrySite/Poetry_Cloud_Delivery
npx wrangler@4.158.0 secret put POETRY_OWNER_TOKEN --name poetry-gallery-api
```

Use a password manager to generate/store 64 random hexadecimal characters (at least 256 bits), and paste only at Wrangler's hidden prompt. Do not paste into chat, a command argument, an environment file or localStorage. This secret command immediately deploys a Worker version. Do not change/delete other secrets. Enter the same token into the website's author field; it remains in page memory until refresh/sign-out.

## Final integration and live verification gates

A's PR is backend-only on feat/poetry-cloud-fix; B's PR remains independent. B must send upload version and delete `{id,version,confirm:true}` and preserve unsaved text around cover refresh. The existing main frontend is incompatible with these new two mutation contracts until B is integrated. Do not release the final frontend until integration/browser checks pass. No automerge label is applied.

After approved backend and integrated frontend release: record exact Worker version, D1 migrations, Vercel READY deployment/SHA; verify domain, health schema/revisions-v3, CORS preflight, anonymous list/detail and denied private reads/writes. Missing Secret is an explicit blocker, not successful release.

Production authoring verification requires separately approved actual content or approved synthetic fixture writes. It must exercise create private draft, reload, edit/history, publish anonymous read, withdraw anonymous 404, backup including histories/covers, and local recovery comparison. Do not delete any resulting production work without separate authorization. Until that gate and Secret input are complete, report production cloud saving as pending verification.

## Integrated A + B acceptance

Session B PR #18, original commit bfc32ff92d8f9d4f4d0913a48dfc398076f08fb4, is incorporated in the final integration branch/PR #17 with authorship preserved. The only integration conflict was CI: keep both cloud-regression and browser-ui-share and run no video tests. At loopback static port 8090 forwarding to actual workerd/local D1 at 8788, both browser-r2 and browser-ui-share passed at 375px: device autosave/reload/switch, private cloud save, failed-save retry, versioned cover upload/read/reopen, publish/cold-link refresh, vertical/square PNG, clipboard/manual/cancel paths, withdrawal 404, offline retry, TXT/Markdown/paste import, long poem and complete archive recovery. All seven non-video Node suites pass on the combined code.

PR #17's original isolated backend CI run 42297105493 passed all backend and live read-only checks but failed the old main frontend's unversioned deletion flow (browser-r2 line 47). This known frontend dependency is resolved by incorporating B's adapted requests. The integrated commit needs its own CI result before any production merge. PR #18 remains the independent frontend review record; final release should use the integrated #17 once approved, without separately duplicating B's patch.
