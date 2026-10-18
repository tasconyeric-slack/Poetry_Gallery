# Poetry Gallery — enforce strict project isolation

Repository is ONLY tasconyeric-slack/Poetry_Gallery. Existing Vercel target ONLY tasconyeric-slack/shici-archive. Domain shici.byliyz.com already linked. Never touch any other repositories, Vercel projects, Supabase databases or unrelated Cloudflare resources.

Single-author Chinese poetry website, mobile/WeChat-first. Keep publicly published works readable without login. Independent Cloudflare D1 + Worker is authoritative. No Supabase or cron keepalive.

Owner login design is WebAuthn Passkey; implementation is DEFERRED. Do not implement insecure bypasses or enable owner write access before safe one-person enrollment/recovery and security verification. Phone SMS abandoned due to enterprise qualification; do not reinstate it.

Continue feat/poetry-publishing-mvp and PR #1. Commit tested code; preserve working demo, visibility boundaries, share/print. Distinguish mock/CI checks from real browser and live auth tests. Never merge to main without owner approval.