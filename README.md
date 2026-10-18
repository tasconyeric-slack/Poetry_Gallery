# 诗词馆 · Poetry Gallery

A small, mobile-first Chinese poetry archive for family use.

**Correct project targets (do not change):**
- GitHub: `tasconyeric-slack/Poetry_Gallery`
- Vercel project: `tasconyeric-slack/shici-archive`
- Until the custom domain is ready, use the project's `.vercel.app` production URL.
- Reserved future domain: `shici.byliyz.com` (DO NOT configure it yet).

## Current state

This is an intentionally dependency-free **read-only demonstration**, not the final publishing MVP. The sample poems are well-known public-domain classical works, **not the owner's family poems**. It provides an actual website shell with mobile layout, archive search/filter, poem reader, and share/copy features. Do not imply the sample content belongs to the family.

To preview locally:

```bash
python3 -m http.server 8000
# visit http://localhost:8000
```

To deploy: link the **existing** Vercel `shici-archive` project to this exact repository, set Framework Preset to `Other`, Root Directory to `./`, and no build command or output directory. Pushes to `main` should deploy automatically. Do not create a second Vercel project.

## Next milestone: functional MVP

Add persistent database-backed poem CRUD, single-owner authentication, and cover/image upload; keep the public gallery and detail pages shareable. After these work, add share-card image export and printable/PDF poetry book.

Reference `AGENTS.md` for mandatory execution guardrails and `docs/MVP_SPEC.md` for acceptance criteria. **Implement code and verify real functionality before lengthy planning.**

## Safety

Never commit passwords, API service-role keys or personally identifying data. Treat published poems as public, drafts as private. Sample content is demonstration-only; replace through the owner workflow once persistence exists.

## Functional publishing MVP (feature branch)

The static gallery now includes a single-owner management interface at `/#admin`,
Supabase-backed CRUD, image upload to a private bucket, and published-only public reads.
No rebuild or new Vercel project is necessary. The official Supabase JavaScript SDK is
loaded from a version-pinned CDN (`@supabase/supabase-js@2.117.1`).
Vercel `/api/config` intentionally exposes only URL and **publishable** key.

**Until a dedicated Supabase instance is configured, the website remains in explicitly
labeled classical-poetry DEMO mode. C2/C3 are NOT verified.**

### Required one-time setup

1. Create a **new free Supabase project solely for Poetry Gallery**. Do not use a database
   belonging to another project.
2. In its SQL Editor, apply `supabase/migrations/20261018000000_poetry_gallery.sql`
   once. It creates the owner whitelist, poems table, private image bucket and RLS.
3. In Authentication → Users, create the intended owner's email identity in the
   **new project**. Copy the newly created Auth user UUID. In the same new project's
   SQL Editor run:

   `insert into public.poetry_owners(user_id) values ('YOUR_OWNER_AUTH_UUID');`

   Replace the placeholder with the new UUID. Never place this UUID, login email
   or authentication tokens in GitHub files.
4. Enable Email OTP / Magic Link under Authentication providers. Set the Auth Site URL
   to `https://shici-archive.vercel.app` and add
   `https://shici-archive.vercel.app/**` to allowed redirect URLs. For the exact
   Preview deployment, also add its exact host; avoid a wildcard for all Vercel
   projects. Magic-link sign-in will *not* create unapproved accounts.
5. In **the existing `tasconyeric-slack/shici-archive` Vercel project only**, set
   `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for Preview and Production, using
   the **new** Supabase project's URL and public publishable key. Do not use a
   service-role or secret key; the public key is safe only because RLS is enforced.
   Redeploy the Preview. Keep Vercel Framework Preset `Other`, root `./`, no
   build command/output directory, and no custom domain.
6. Open the Preview `/api/config`: it must report `configured:true` with only
   public values. Visit `/#admin` to sign in via the authorized email.

### Live acceptance tests to perform after setup

- Sign in → create draft → refresh → edit → sign out/in → draft remains.
- Publish → view `/#poem/<UUID>` in a private browser → unpublish → anonymous
  detail becomes unavailable on refresh.
- Confirm an anonymous database SELECT returns no drafts and anonymous INSERT,
  UPDATE and DELETE are rejected. Unapproved signed-in users cannot edit.
- Upload a JPG/PNG/WebP image (≤5 MB) to a saved poem, refresh and view it.
- Check on 375px mobile, desktop and WeChat; try share URL and browser print.

Storage images are private; their temporary signed URLs may remain usable for up to
15 minutes after unpublishing. A later cleanup task can remove orphaned media.

### Developer checks

`node --check app.js && node --check cms.js && node --check api/config.js`

`node scripts/smoke.mjs && node scripts/mvp-check.mjs`

For unconfigured static preview: `python3 -m http.server 8000` shows DEMO only.
Live auth and storage testing requires the configured Vercel Preview.
