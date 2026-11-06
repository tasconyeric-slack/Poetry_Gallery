# Claude Code — Poetry Gallery Release 2

Only repository `tasconyeric-slack/Poetry_Gallery`. PR #1 is MERGED; do not work on the old `feat/poetry-publishing-mvp` branch.

New Release 2 master: https://github.com/tasconyeric-slack/Poetry_Gallery/issues/8
First deliverable: Issues #9–#11, branch `feat/poetry-authoring-archive-r2`, a single PR to `main`. Second deliverable: #12–#13 lyric-video studio on separate branch and PR. Passkey #14 is later; don't block functional authoring on it.

Product core: mobile writing, local autosave, secure owner-only D1 drafts/publish/edit/unpublish, durable archive/revisions/backup, social share, then actual exported lyric videos.

Use existing Vercel `shici-archive` and Cloudflare `poetry-gallery-api` + `poetry-gallery-d1`; never modify other projects. No Supabase, SMS, fake production poems, paid video APIs or unrelated DNS changes.

A temporary 256-bit Worker secret owner-token gate is permitted for cloud writes in Release 2 if server-enforced. Never permit anonymous cloud writes or private reads, commit the token, or persist it in the browser. Device-local drafts may work without authentication and must be labeled not synced. See AGENTS.md and Issues for complete constraints.

Build the minimal real end-to-end experience, test the critical path once, commit actual code and concise evidence. Do not merge production PRs without owner approval.
