# Poetry Gallery — Release 2 implementation contract

Repository: ONLY `tasconyeric-slack/Poetry_Gallery`. Existing Vercel: `tasconyeric-slack/shici-archive`. Existing Cloudflare: `poetry-gallery-api` Worker and `poetry-gallery-d1` D1. No other repositories, sites, resources or DNS changes.

## State and priority
- PR #1 was **merged into main**. Earlier `feat/poetry-publishing-mvp` / PR #1 directions are obsolete. Never resume the old merged branch.
- Master delivery Issue **#8**. **PR A:** implement **#9 authoring/cloud save, #10 durable archive, #11 social sharing** on `feat/poetry-authoring-archive-r2` off main; open/update only one PR to main. **PR B later:** **#12 lyric video + #13 integration**, separate branch/PR. **#14 Passkey is deferred**.
- Actual MVP must let owner write, autosave, reopen, edit, publish, unpublish and archive poems from a phone, then share and produce a playable video. A read-only gallery or developer-only JSON import is not enough.
- Do not stall first usable authoring delivery for video. Keep iterations short; check real critical path once.

## Temporary owner publishing credential
- Device-local drafts are usable without credentials; label them unsynced and allow export.
- **Cloud private reads and ALL mutations must require server-verified owner credentials.** Release 2 may use a dedicated high-entropy (>=256-bit) `POETRY_OWNER_TOKEN` Cloudflare Worker secret entered by owner in UI and held in JS memory only. Do not commit, print, log, persist or put secrets in URL; no public cloud writes or drafts. Server-side validation plus specific origin restrictions.
- This is a narrowly scoped interim capability, not a multi-account/login system. Passkey replacement later (#14). If Worker secret is not configured, show honest device-only mode and exact minimal setup instead of claiming successful publishing.
- Add only forward database migrations; ensure save/restore/revisions/backup protect drafts and real content. Never seed fake family poems in production. Use synthetic local fixtures.

## Video
Use an on-demand lightweight browser lyric-video renderer: 9:16 timed Chinese text, optional owner-provided image/audio, actual playable MP4 when codec supports it or valid WebM fallback. No costly rendering backend. Consider Mediabunny, WebCodecs and browser capability checks; no unsupported claims or disguised file renaming. Do not bundle copyrighted audio.

## Delivery
Produce working commits, targeted tests and concise PR evidence. No overengineering, repeated audits, new Supabase/SMS, unrelated modifications or unsolicited production writes. Do not merge to main without user approval; no private production text imported without approval. Follow project-specific issue acceptance criteria over outdated Release 1 documents.
