# Issue21 deployment / local run

Current branch retains existing capability auth and canonical Worker, stable poem IDs and hash links, revisions and backups. No new hosted resources/dependencies. Collection backup extends v2 compatibly; old archives restore without collection fields. Migration0004 only adds collection tables; it does not alter/delete poems/history.

Local: `node scripts/local-test-server.mjs` then open http://localhost:8080. This serves actual Worker logic on synthetic in-memory SQLite and never calls production for tests (Playwright intercepts the canonical Worker origin). The application itself continues using the existing canonical Worker in ordinary browsing. Author unlock is required for private cloud operations; no token is persisted. Local tests use only the fixture capability in the local-server source. Node24+ is required for node:sqlite.

Checks: smoke,mvp-check,config,worker,d1-lifecycle,import-poems,cloud-regression,collections,share-preview; mobile authoring+collections browser journeys; visual-states at3 widths. Actual Wrangler4.158.0 local0001–0004 + workerd/D1 regression also passed; see evidence/local-worker-test.txt.

## Production approval remains separate

PR stays Draft until approved release steps complete. Do not merge/deploy frontend against a Worker lacking collection endpoints/tables. No Secret change is required.

1. Read-only verify existing `poetry-gallery-api`, D1 `poetry-gallery-d1` ID6f92588b-0a92-41c6-ad43-ae014f6112fe and migration table. Export current complete private backup using authenticated UI; verify recovery locally. Keep backup outside git.
2. Review pending migrations with `npx wrangler@4.158.0 d1 migrations list poetry-gallery-d1 --remote`. If0003 is still pending, review it separately; do not assume production already matches local.
3. **Only after owner approval:** `npx wrangler@4.158.0 d1 migrations apply poetry-gallery-d1 --remote`, then `npx wrangler@4.158.0 deploy --config wrangler.toml`. Apply forward migrations only; no reset/rebuild.
4. Deploy existing Vercel `shici-archive` from approved branch/merge. `vercel.json` supplies `/p/:id` SSR OG preview rewrite; previous `/#poem/:id` URLs still work.
5. Read-only verify public list/detail, draft refusal, withdrawn404 and OG preview; author validates real WeChat long-press/link rendering. Production write testing requires separate authorization.

Local side-by-side comparisons require the ignored official images. Their source URLs/crop identities are preserved in docs/native-reference-manifest.json and native-reference-evidence.md; do not commit originals.

Browser-test setup: `npm install --no-save --package-lock=false playwright@1.65.0`, then `npx playwright install chromium`. Comparison tool setup: `python -m pip install Pillow` if not already available. These are development-only tools; the frontend requires no build step.
