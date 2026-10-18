# Poetry Gallery P0 specification

ONLY tasconyeric-slack/Poetry_Gallery and EXISTING shici-archive Vercel project.
shici.byliyz.com is already linked; DO NOT reconfigure it.

A single family member can publish and edit original Chinese poetry on a phone. Guests can browse, read, search, copy/share and print published poems with clear Chinese typography and 375px responsive layout. Unpublished poems and cover images must remain private.

Backend: independent Cloudflare D1 + Worker, NOT Supabase. Login: one authorized mobile phone using paid-provider SMS code, then long-lived secure cookie. Phone must be explicitly whitelisted in server secrets. No email or keepalive dependence. Cover images compressed and stored in D1 for this small archive; advanced image hosting may follow.

Core operations: create draft, refresh/edit, publish, unpublish, delete with confirmation; public gallery only published content; negative tests for unauthenticated writes and draft/media reads. Mobile/WeChat share fallbacks and browser print anthology.

SMS credits/provider qualifications and initial worker/Vercel server-only variables are necessary human setup. Never mark full C2/C3 complete until live SMS, cross-device persistence, auth/authorization, cover, desktop/mobile and Vercel Preview tests pass.
