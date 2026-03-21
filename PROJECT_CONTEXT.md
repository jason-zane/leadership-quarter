# Leadership Quarter Repository Context

## Overview
Leadership Quarter is a multi-surface production Next.js application backed by Supabase.

The repo currently contains:
- public marketing pages and framework landing flows
- assessment delivery for public, campaign, and invitation-based journeys
- admin dashboard workflows for campaigns, assessments, contacts, reports, and settings
- client portal workflows for organisation members
- report rendering and PDF generation
- Supabase migrations and local operational tooling
- a Python sidecar used for heavier rendering and analysis workloads

## Primary Areas
- `app/`: routes, layouts, API handlers, auth handoff, and surface composition
- `components/`: shared UI plus feature-specific components by surface
- `utils/`: domain logic, orchestration, auth/security helpers, reporting, and services
- `supabase/`: schema migrations
- `tools/`: operational scripts and local support tooling
- `docs/`: active architecture and operations docs
- `docs/archive/`: completed audits, checkpoints, and historical planning material

## Current Source Of Truth
- Repo entry and local setup: `README.md`
- Architecture and placement rules: `docs/architecture.md`
- Assessment cutover state: `docs/assessment-cutover-recovery-plan.md`
- Production and deployment operations: `docs/production-checklist.md`, `docs/deployment-flow.md`
- Queue/cron operations: `docs/queue-operations-runbook.md`
- Repo hygiene and documentation rules: `docs/repo-hygiene.md`

## Working Rules
- Treat `README.md` and `docs/architecture.md` as canonical before adding new top-level docs.
- Keep route modules thin; move reusable business logic into `utils/`.
- Keep generated artifacts and local runtime residue out of source control unless they are intentional fixtures.
- Archive completed plans and dated audits under `docs/archive/` instead of leaving them mixed with active instructions.
