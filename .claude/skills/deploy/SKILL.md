---
name: deploy
description: Trigger a SaLKo deployment via GitHub Actions workflows. Guides through build + deploy steps for dev or prod.
disable-model-invocation: true
---

Trigger a SaLKo deployment via GitHub Actions. All workflows are `workflow_dispatch` on the `mrMikoma/SaLKo_website` repo.

## Pre-flight checks

Before triggering anything, verify:
1. Current branch: `git branch --show-current`
2. Branch is clean: `git status`
3. Latest commit is pushed: `git log origin/$(git branch --show-current)..HEAD --oneline`

If there are unpushed commits, stop and tell the user.

## Deployment sequences

**Deploy to dev** (branch: `dev`): pushing to `dev` builds and deploys automatically. Run these only to redeploy by hand:
```
Step 1 — Build:  gh workflow run build-and-publish-dev.yaml --repo mrMikoma/SaLKo_website
Step 2 — Deploy: gh workflow run deploy-app-dev.yaml --repo mrMikoma/SaLKo_website
```
Wait for step 1 to succeed before running step 2:
```
gh run watch --repo mrMikoma/SaLKo_website $(gh run list --repo mrMikoma/SaLKo_website --workflow=build-and-publish-dev.yaml --limit 1 --json databaseId -q '.[0].databaseId')
```

**Deploy to prod** (branch: `main`). If `postgres/migrations/` has files that prod hasn't applied yet, run `db-migrate.yaml` against prod first (manual, needs approval):
```
Step 1 — Build:  gh workflow run build-and-publish-prod.yaml --repo mrMikoma/SaLKo_website
Step 2 — Deploy: gh workflow run deploy-app-prod.yaml --repo mrMikoma/SaLKo_website
```

## Rules
- Never trigger prod workflows from a non-`main` branch.
- Always confirm the target environment with the user before triggering.
- Show the workflow run URL after triggering so the user can monitor progress.
