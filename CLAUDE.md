# Claude Code — Poetry Gallery ONLY

Repository: tasconyeric-slack/Poetry_Gallery. Branch feat/poetry-publishing-mvp, existing draft PR #1. Existing Vercel shici-archive; shici.byliyz.com already linked. Do NOT change unrelated projects or DNS.

Architecture: isolated Cloudflare D1 + Worker, public published-only gallery. SMS is abandoned. Owner login is deferred WebAuthn Passkey with restricted first enrollment and recovery. Never allow anonymous writes, and never claim login verified until implemented. Continue non-login features/test coverage per README and docs/CODEX_TASK.md. No merge without explicit approval.