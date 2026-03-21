# Repository Cleanup Roadmap

Status date: 2026-03-21

This file tracks the active repository cleanup program. Historical UI-split planning and completed audits now live under `docs/archive/`.

## Current Priorities
- [ ] Align repo docs with current architecture and operations
- [ ] Remove tracked generated artifacts and harden ignore rules
- [ ] Treat direct PDF rendering as the canonical report delivery path unless queue-based exports are explicitly restored
- [ ] Reduce migration-era naming exposure in canonical service entrypoints
- [ ] Add repo hygiene checks to prevent drift

## Active Workstreams

### 1. Documentation Truth
- [ ] Keep `README.md` aligned with the live app shape
- [ ] Keep `PROJECT_CONTEXT.md` as a concise local-context primer
- [ ] Keep `docs/architecture.md` as the placement and structure source of truth
- [ ] Move completed audits, checkpoints, and dated plans into `docs/archive/`

### 2. Repo Hygiene
- [ ] Remove tracked runtime residue and temp artifacts
- [ ] Ignore generated local outputs
- [ ] Keep only intentional sample assets in source control
- [ ] Add an automated repo audit script

### 3. Report Delivery
- [ ] Remove stale references to nonexistent report-export cron routes
- [ ] Keep direct PDF rendering docs aligned with current code
- [ ] Reintroduce queue/export docs only if the queue route is restored as a real product path

### 4. Structural Cleanup
- [ ] Collapse redundant service wrapper modules where they add no useful boundary
- [ ] Keep compatibility routes documented separately from active routes
- [ ] Refactor oversized mixed-responsibility modules in focused follow-up passes

## Validation Standard
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run audit:repo`
