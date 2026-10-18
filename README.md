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
