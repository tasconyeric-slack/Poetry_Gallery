# P0 — Poetry Gallery MVP

## Goal
A father can independently publish his original Chinese poems; family members can comfortably browse, read and share them from a phone. Use the EXISTING GitHub and Vercel project. The site must be visibly usable before any extensive architecture work.

## Current baseline (Stage 0)
- Dependency-free static gallery on `main`: elegant mobile-friendly home, example archive, search/filter, poem reader, copy/share, print layout.
- All existing entries are marked as DEMO/classical poems. No sign-in or database in the baseline.
- No custom domain setup.

## P0 product requirements
1. **Public pages:** gallery/homepage, searchable poem list, readable detail page with stable shareable URL; polished Chinese typesetting and mobile layouts.
2. **Single owner login:** preferably email magic link (free-tier compatible); login/logout/session persistence and an access-controlled `/admin` workspace. No paid SMS integration.
3. **Data persistence:** choose a suitable managed SQL database (Supabase is the suggested low-setup default; verify current free-plan constraints). Poems include ID, title, content, genre/category, created/published timestamps, status (draft/published), optional note, optional cover/image path. Define schema and migrations in repo.
4. **Real CRUD:** owner creates, edits, saves draft, publishes, unpublishes and deletes (with confirmation). Changes survive reload and signing in again, and are visible across devices.
5. **Access control:** visitors see ONLY published work; only owner can mutate. Enforce at database policy/server boundary, not just UI. Use Supabase RLS or an equivalent sound policy. Media upload restricted to owner; public only where intended.
6. **Image/cover:** upload at least one cover photo for a poem, store it durably, and display it without distorted aspect ratio.
7. **Share:** native share where available and copy URL fallback. Implement image share-card export after core CRUD; do not let its complexity block basic publishing.
8. **E-book:** simple printable anthology / browser Print-to-PDF with deliberate page breaks is acceptable for P0; elaborate PDF server rendering can follow.

## UX requirements
- Chinese-first, clear hierarchy; avoid tiny low-contrast text and decorations over text.
- Mobile viewport ~375px must not scroll horizontally.
- Readable Chinese line breaks and punctuation; preserve poetry stanza formatting.
- Empty, loading and error states for real data.
- Keyboard accessibility and obvious admin controls.
- WeChat in-app browser: sharing fallback must work without Web Share/clipboard APIs.

## Non-goals
No WeChat mini program, paid SMS, comments, community, payment, music/MV, AI content generation, multi-tenant roles, advanced SEO/admin analytics. Custom domain `shici.byliyz.com` is reserved for later.

## Checkpoints
**C0 (current):** tracked, runnable homepage/demo and documented setup on GitHub.
**C1:** first live production site at the project's Vercel default domain; homepage and mobile UI actually load. No real owner data needed.
**C2:** authentication + database + CRUD work end-to-end, including refresh/relogin and public/private permissions.
**C3:** cover upload + share + basic printable anthology are tested.

## Definition of done
- There are substantive source changes committed to this repository.
- Production/preview deployment is READY and publicly reachable as configured.
- Owner test: sign in → create draft → refresh → edit → publish → open public detail in separate unauthenticated session → unpublish → public page disappears → sign out/in → draft remains.
- Negative test: unauthenticated write to database/API rejected.
- At least 375px mobile and desktop verified, no horizontal overflow, basic keyboard navigation.
- README lists only necessary human actions and exact commands.
- Report branch, commit SHA, PR, deploy URL, tested functionality and anything still blocked. Do not report untested items as completed.
