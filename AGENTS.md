# Poetry Gallery — cloud archive delivery contract

Only repository: `tasconyeric-slack/Poetry_Gallery`. Existing Vercel `shici-archive`, site https://shici.byliyz.com/, Worker `poetry-gallery-api`, D1 `poetry-gallery-d1` (`6f92588b-0a92-41c6-ad43-ae014f6112fe`). No new projects, resources, DNS changes or paid dependencies.

## Current scope

Task A on `feat/poetry-cloud-fix` owns Worker, API compatibility proxy, migrations, cloud integration tests and release docs. Task B independently owns upload/editor/WeChat sharing on `feat/poetry-ui-share`. Use separate worktrees and stage explicit files. Integrate B and run the full authoring journey before the final production frontend release. If B is unfinished, deliver A's PR first.

The goal is authorized authoring, private cloud drafts, permanent version history, publishing/withdrawal, confirmed deletion, covers and recoverable backups. Video/MV development, tests and dependencies are paused. Existing video code is outside this task. Passkey, SMS, Supabase and multi-user login are deferred. Older README/CLAUDE/Issue directions cannot expand this scope.

## Authentication and data

`POETRY_OWNER_TOKEN` is a high entropy (at least 256 bits, 64 hex characters) Cloudflare Secret and a browser-memory-only capability. Never print, log, commit, put in URL/localStorage or persist the owner token to a local file. All private reads and mutations require server verification. Missing/invalid Secret fails closed. Public list/detail/current cover expose only published works. Preserve unrelated existing Secrets.

Use the existing Worker directly. `/api/poetry` is only a caller-credential forwarding compatibility proxy to that same Worker. No gateway key or Vercel environment setting is required. Never inject owner authorization in the proxy. CORS private requests use exact verified origins.

Do not write any real or synthetic poems to production or delete production data without separate explicit authorization. Apply only forward migrations after local tests, target/schema verification, verified backup and owner approval. No database reset/rebuild. Secret changes, production migration, and important production changes require separate confirmation. Present tested code and exact commands before asking. For ordinary same-repository changes: create a ready-for-review PR to main (not Draft). GitHub Actions automatically squash-merges it only after the latest `Poetry Gallery checks` run succeeds at that head SHA; no `agent-automerge` label is needed. Keep unfinished or sensitive PRs as Draft or apply `hold-merge` / `manual-merge` to prevent automated merging. Production D1 migrations, production Worker deployments/Secrets, destructive writes, DNS and spending still require separate explicit owner approval. See `docs/AUTOMATION.md`.

## API integration contract

- `save`: keep the same UUID `localId` for retries of a new device draft. Server uses it as the poem ID. Once known, send `id` and current `version`. A conflicting retry returns 409 and retains the existing work. Never discard device edits on failure.
- `upload`: `{poem_id,version,mime:"image/jpeg",base64}` returns `{cover_id,version}`. Update the current version; never discard unsaved text when refreshing metadata. Cover changes create revisions atomically.
- `delete`: `{id,version,confirm:true}` after an explicit UI confirmation. Stale version returns 409. Successful deletion cascades history/covers.
- `restore`: `{id,version,revision}` restores text/status/cover as a new revision.
- `backup`: complete private `poetry-gallery-backup-v2` contains poems, historical revisions, and all cover bytes. Recovery tool is local-only, transactional and refuses collisions or missing referenced covers.

Run `node scripts/cloud-regression.test.mjs`, the existing non-video suites, then the same regression against real local Wrangler/D1 via `POETRY_LOCAL_WORKER_URL=http://127.0.0.1:8788`. Run B's browser journey after integration. Do not claim production completion based on local/preview tests. See README and docs/CLOUD_RELEASE.md for concrete release steps and evidence.
