# Architecture Overview

## Current Shape

This repo is a single Next.js application serving several product surfaces:
- Public site
- Assessment runtime
- Admin backend
- Client portal
- Report/print routes
- API routes backed by Supabase

That shape is intentional for now. The code should still be organized as if these are separate
domains, even while they live in one app.

## Primary Boundaries

Application layer:
- `app/`
- Purpose: routing, request/response adaptation, auth gating, page composition

Feature UI layer:
- `components/`
- Purpose: reusable UI primitives and surface-specific components

Domain/platform layer:
- `utils/`
- Purpose: business logic, orchestration, external service adapters, auth/security helpers

Data and operations:
- `supabase/`
- `tools/`

## Placement Rules

When adding or changing code:
- Keep `page.tsx`, `layout.tsx`, `route.ts`, and `actions.ts` focused on orchestration.
- Move reusable business logic out of `app/` and into domain modules under `utils/`.
- If a page or feature editor starts accumulating embedded UI primitives or large JSX sections, split it into local `_components/` files next to the route.
- Prefer domain-specific module names over broad grab-bags. Example: assessment scoring helpers belong under `utils/assessments/...`, not generic shared folders.
- Only place code in broad shared folders when it is used by multiple surfaces.

## Current Cleanup Direction

The active incremental cleanup direction is:
- keep a single Next.js app
- reduce large files by extracting local feature components
- split multi-purpose domain modules behind stable public entrypoints
- keep documentation aligned with the actual system shape

Recent examples:
- Assessment scoring config logic is split into focused modules under `utils/assessments/scoring-config/` with `utils/assessments/scoring-config.ts` retained as the stable entrypoint.
- The scoring editor route uses local `_components/` and `_lib/` files so the page module acts as the orchestrator.
