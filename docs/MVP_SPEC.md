# Release 1 — Poetry Gallery, revised 2026-11-06

Only tasconyeric-slack/Poetry_Gallery; existing shici-archive Vercel project, already linked shici.byliyz.com.

Public P0: Chinese mobile-first accessible typography, searchable/filterable published poem catalogue, stable shareable detail, optional private-stored cover visible only after publishing, native/WeChat-friendly sharing, selection/copy fallback, browser print anthology. No registered visitor accounts.

Backend: independent Cloudflare D1 poetry-gallery-d1 and Cloudflare Worker poetry-gallery-api. No use of Supabase or keepalive jobs. Public GET endpoints operate without SMS, email, secret Vercel settings, or owner login.

Owner P0 later: WebAuthn Passkey with owner-only initialization and lost-phone recovery, secure HttpOnly sessions, create/edit/save draft/publish/unpublish/delete, image upload. Never permit public registration or write access. Source code may exist while login is deferred, but privileged routes remain disabled until real security tests pass.

Do not call authenticated publishing, cross-device persistence, owner images, or C2/C3 fully done until real Passkey and owner tests pass. No custom domain changes, community features, payments, comments or AI.
Release 1 includes optional author attribution (forward migration 0002), distinct loading/empty/offline/explicit-demo states, direct detail fetch on cold URLs, and private validated JSON upserts into existing D1. Classical examples are opt-in and labeled in reader, share cards and printed anthology. Owner-approved real content has not been supplied. See README for import workflow.
