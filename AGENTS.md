# Agent execution contract — Poetry Gallery

You are working on a **NEW, separate project**. Before changing anything, verify:
- `git remote -v` points to `tasconyeric-slack/Poetry_Gallery`.
- The Vercel target is the EXISTING `tasconyeric-slack/shici-archive` project.
- Never touch `port-website`, `ccmacro`, `living-investment-thesis-agent`, or another repository or project.
- Do not set up the custom domain yet.

## Highest-priority instruction
**Ship a functioning mobile-first poetry website.** Do not spend cycles on speculative architecture, exhaustive research, designing a grand system, or delegating work to itself without committed code. If blocked by a third-party account or missing credentials, keep the public demo deployable; describe one precise human action, and implement the unblocked portions.

## Required work order
1. Verify the repo, current branch, files and existing Vercel project.
2. Run or inspect the current demo; preserve working behavior.
3. Implement the smallest end-to-end feature, commit the code, test it.
4. Continue features in `docs/MVP_SPEC.md` until all P0 acceptance criteria pass.
5. Check desktop/mobile and Vercel Preview. Report exact commit, PR and tested URL.
6. Do not claim deployed/verified unless a deployment status and HTTP page were actually checked.

## Product boundaries
- Initial owner is one family member, not a multi-tenant social network.
- The site is mainly read on mobile and on WeChat's in-app browser.
- Visitors can browse published poems without signing in.
- Only authenticated owner can author, edit, publish and delete.
- Drafts and owner interface must never leak through public APIs or search.
- Keep personal poems private until the owner intentionally publishes.
- Database-backed storage is required for the functional MVP; browser localStorage alone is NOT persistence.
- Do not introduce payments, comments, likes, recommendation feeds, AI writing, music or mini-programs in P0.
- Phone/SMS sign-in is NOT required for P0; choose a low-cost email magic-link owner sign-in and document the setup. Never require a paid SMS service.
- Do not publish invented poems as though they are the owner's real work. Current classical works are explicit demos.

## Workflow
- For new feature work, use a branch `feat/...` and a PR into `main`. Do not force-push.
- Keep changes reviewable; do not block code creation on documentation approval.
- Run available checks before proposing merge.
- Never log or commit secrets or privileged Supabase service-role keys.
- When database credentials are absent, create SQL/schema/migration instructions and an explicit `.env.example`; do not fabricate values.
