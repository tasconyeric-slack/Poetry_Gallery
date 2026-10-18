# IMPLEMENTATION TASK — Poetry Gallery functional MVP

You are the implementer, not the project planner. Start coding in this session. Do not respond with only analysis, an architecture proposal, or a task list.

## Exact targets — mandatory

- Repository: `https://github.com/tasconyeric-slack/Poetry_Gallery`
- EXISTING Vercel project: `https://vercel.com/tasconyeric-slack/shici-archive`
- Production URL: `https://shici-archive.vercel.app`
- Current baseline: static HTML/CSS/JS website on `main`, automatic Vercel production deploy working, GitHub Actions smoke test passing.
- Reserved custom domain: `shici.byliyz.com`; DO NOT configure it.
- No other repository, Vercel project or existing website is in scope.

Read `AGENTS.md`, `CLAUDE.md`, `docs/MVP_SPEC.md`, and `README.md` before working. Verify `git remote -v` and `git status`.

## Objective

Deliver the next meaningful milestone: a real database-backed poetry publishing MVP usable independently by one owner (the user's father). Public visitors read published poems; the owner can log in, write, save and publish. Mobile/WeChat in-app browser comes first. Preserve the existing visual style unless usability requires concrete changes.

## Implementation order

### 1. Persist works and display live data
- Use Supabase (Postgres + Auth + Storage) as the default zero/low-cost managed backend, unless a demonstrably simpler free solution fits all security requirements. Do not use localStorage as the source of truth.
- Include versioned SQL migrations and strict RLS. Fields: UUID, title, poem body with line breaks, genre, optional date/note, draft/published status, optional cover image path, created/updated/published timestamps, owner ID.
- Anonymous readers can SELECT published works only. Only the single authorized owner can create/update/delete and read drafts. Enforce this in RLS, not merely hidden UI. No other signed-in user can publish.
- Replace the hardcoded public catalogue with database reads. Keep the current sample data as explicitly labeled DEMO fallback when the backend is not configured; never silently publish it into the database or claim it is family content.
- Preserve deep links to poem details; maintain readable error/empty/loading states.

### 2. Real owner workflow
- Low-cost single-owner email magic-link sign-in is acceptable and preferred for P0; do not introduce paid SMS or require a domain.
- Provide `/admin` or an equivalent protected owner workspace, with sign-in/sign-out and persistent sessions.
- Add Create, Edit, Save Draft, Publish/Unpublish, Delete with confirmation. Persist and re-read changes from the actual backend.
- Ensure phone-sized forms and Chinese multiline content editing work well; whitespace/newlines must be preserved.

### 3. Image + sharing
- Implement owner-restricted cover upload to Supabase Storage (reasonable file type/size validation), with reliable public display for published works and protection for private draft media.
- Existing native Share/copy-link and print flow must continue working. Add a simple WeChat-friendly exportable share image if time permits, after CRUD/RLS work is proven.
- A print-friendly anthology with a selection of published works is sufficient for initial PDF functionality. No server-side PDF renderer is necessary at this stage.

### 4. Tests and deployment
- Add unit/integration tests for data access and permissions where feasible. Test an anonymous SELECT of drafts and unauthorized write are denied; test owner CRUD on real Supabase if credentials are available.
- Check mobile width 375px and desktop, navigation, published deep links, line breaks and share fallback. Run all repo checks and update GitHub Actions for the chosen build stack.
- Use a feature branch `feat/poetry-publishing-mvp`, push real code and open a PR. Verify Vercel Preview if possible. Do not replace or create Vercel projects.
- Keep production `main` stable until reviewed merge; if the user has separately authorized automatic release, verify merged production after it occurs.

## Credentials / human actions

Never invent Supabase credentials, expose service-role keys in frontend code, commit real secrets, or pause all coding waiting for setup. Create `.env.example` with key NAMES only and a short, exact setup section in README. If no Supabase project exists, prepare schema/RLS and frontend independently, then identify the minimal human actions to create the free project, apply the migration, configure owner identity/Auth redirect URLs, and enter public URL/anon key in Vercel. A `NEXT_PUBLIC`/`VITE` public anon key is acceptable ONLY with correct RLS; service-role remains server-only or unused.

Use the official Supabase SDK and keep the architecture deliberately small. You may introduce a standard frontend framework if it genuinely simplifies secure auth, routing and data flows, but avoid migrating solely for novelty. Document which frontend stack you actually chose, and ensure the Vercel framework preset matches it.

## Acceptance — no false completion claims

Mark C2 complete only if there is evidence for:
1. Owner signs in and creates a poem as draft.
2. Draft survives reload and a second login.
3. Owner edits and publishes; a separate anonymous session reads it at a stable URL.
4. Owner unpublishes it; anonymous session loses access to that detail.
5. Anonymous write and draft reads are rejected by the backend.
6. Cover upload displays correctly and survives reload.
7. GitHub Actions and deployment are green, mobile and desktop smoke tested.

When some steps cannot be executed because Supabase hasn't been configured, report those as BLOCKED or UNTESTED, not DONE. Provide exact human setup steps and the working PR anyway.

**Do not** spend hours brainstorming frameworks, debugging irrelevant old projects, or claiming the app is complete because files or an empty Vercel project exist. Produce substantive code immediately.

## Output required at the end

A short delivery report: branch, commit SHA, PR URL, Preview URL and verified deployment state, completed features with test evidence, exact blockers needing user action, and the next highest-value step. Avoid vague progress reports.
