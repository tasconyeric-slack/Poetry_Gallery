# Pull request automation

The repository uses `.github/workflows/smoke.yml` for the `Poetry Gallery checks` CI workflow and `.github/workflows/main.yml` for automated merging.

## Default for ordinary changes

1. The coding agent creates a PR targeting `main` from a branch in this repository. The PR should be **ready for review** (not Draft) when its implementation is complete.
2. GitHub Actions runs the current `Poetry Gallery checks` suite.
3. Once the **latest** PR CI run for the current head commit succeeds, the merge workflow squash-merges it and deletes its branch. No `agent-automerge` label or manual merge action is necessary.
4. Failure, pending checks, stale commits, conflicts, forks and draft PRs are never automatically merged. Fix the issue and push to the same PR. The next successful CI run retries automatically.

## Explicit hold for a sensitive change

Keep a PR as **Draft** or apply `hold-merge` / `manual-merge` to stop auto-merge. Use this for unfinished integration, production migration/deployment coordination, secret or access-control changes, destructive data operations and other changes requiring an owner decision. When approved and ready, remove the hold and mark it ready; the automation rechecks CI before merging.

**Merging code is not authorization to run a Cloudflare D1 production migration, set secrets, deploy a Worker, import private poems, change DNS, or spend money.** Those require separate explicit approval. Vercel's existing `main` integration may deploy frontend changes on merge, so use Draft/hold-merge for changes not ready to ship.

## Why this does not use `gh pr merge --auto`

This repository currently has no visible rulesets enforcing required checks. Enabling GitHub auto-merge can cause immediate merging if GitHub sees no unmet branch requirements. Instead, the privileged workflow independently checks the latest completed `Poetry Gallery checks` run at the exact PR head SHA before issuing `gh pr merge --squash --match-head-commit`.

`pull_request_target` is deliberately restricted to GitHub API metadata operations: the privileged workflow never checks out or executes code from the PR branch.

If an otherwise eligible PR does not merge, inspect Actions → `Agent Auto Merge` and the PR's Checks tab. An owner can also check repository Settings → Actions → General → Workflow permissions for the GitHub Actions token's ability to write PRs. GitHub may block a merge for repository protection, conflicting changes or missing permissions, and the workflow never uses `--admin`.
