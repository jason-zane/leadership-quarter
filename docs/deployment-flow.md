# Deployment Flow (GitHub -> Vercel)

This project uses Git-based production deployments from `main`.

## Standard Flow

1. Open a pull request targeting `main`.
2. Wait for CI checks to pass:
   - `Lint`
   - `Unit`
   - `Build`
   - `E2E Smoke`
3. Merge PR into `main`.
4. Vercel auto-deploys the merge commit to Production.

## Required Repository Controls

Configure branch protection for `main` in GitHub:

- Require a pull request before merging.
- Require status checks to pass before merging.
- Include required checks from `.github/workflows/ci.yml`.
- Restrict force pushes and branch deletion.

## Vercel Controls

- Project must be connected to the production repository.
- Production Branch must be `main`.
- Git auto-deploy must remain enabled.
- Keep `vercel.json` aligned with the cron routes that actually exist in `app/api/cron/*`.

## Emergency Policy

Avoid manual production deploys unless GitHub auto-deploy is down.
If a manual deploy is used, immediately follow with a Git commit/PR so git history stays the source of truth.
