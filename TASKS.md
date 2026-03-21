# Admin + Client Portal UI Split Execution Plan

## Current Priority

- Assessment cutover recovery and cleanup plan:
  - [docs/assessment-cutover-recovery-plan.md](docs/assessment-cutover-recovery-plan.md)
- Why this exists:
  - the current assessment platform is a partial cutover from `assessments-v2` back to canonical `assessments`
  - the repo still contains legacy assessment code, rebuilt V2 implementation, and cutover glue
  - use the assessment cutover document as the source of truth before doing further assessment-route, API, runtime, or report cleanup

## Program Objective
Execute a major UI and architecture split so we can build fast without blending internal admin UX and client-facing portal UX.

- Admin surface: `/dashboard/*`
- Client surface: `/portal/*`
- Shared layer: only explicit foundation primitives/tokens, no accidental coupling

## Program Constraints
- Do not regress current auth/role behavior.
- Keep backend-admin UX dense and operational.
- Keep client portal UX simpler and progress-oriented.
- Keep route-level ownership clear (`dashboard` vs `portal`).

## Scope Baseline (confirmed in repo)
- Admin shell and nav:
  - `app/dashboard/layout.tsx`
  - `components/dashboard/nav.tsx`
- Client portal routes:
  - `app/portal/layout.tsx`
  - `app/portal/page.tsx`
  - `app/portal/campaigns/*`
- Portal API/auth stack:
  - `app/api/portal/*`
  - `utils/portal-auth.ts`
  - `utils/portal-api-auth.ts`
  - `utils/portal/types.ts`

## Target Architecture

### 1) Shared Foundation (thin)
- Location: `components/ui/foundation/*` and `app/globals.css`
- Contains only:
  - design tokens (neutral + brand base)
  - low-level primitives (`surface`, `stack`, `field`, `button`, `table frame`)
- Explicitly does not contain:
  - admin-specific navigation/components
  - portal-specific workflow/components

### 2) Admin UI System
- Location: `components/dashboard/ui/*`
- Optimized for:
  - high-density tables
  - triage workflows
  - bulk/admin actions

### 3) Portal UI System
- Location: `components/portal/ui/*`
- Optimized for:
  - campaign participation visibility
  - response/analytics clarity
  - reduced cognitive load for client users

## Phased Execution

### Phase 0: Split Contract + Foundations (Day 1)
Status: `todo`

- [ ] Add split policy doc section to this file and enforce folder boundaries.
- [ ] Extend `app/globals.css` with scoped token groups:
  - [ ] `--admin-*` token aliases
  - [ ] `--portal-*` token aliases
  - [ ] shared neutral tokens for typography/spacing/radius
- [ ] Create shared primitives in `components/ui/foundation/`:
  - [ ] `surface.tsx`
  - [ ] `page-container.tsx`
  - [ ] `button.tsx`
  - [ ] `field.tsx`
  - [ ] `table-frame.tsx`

Exit criteria:
- Shared layer compiles and is used by both tracks without style leakage.

### Phase 1A: Admin Shell and Patterns (Days 2-3)
Status: `todo`

- [ ] Refactor `app/dashboard/layout.tsx` to new admin shell primitives.
- [ ] Refactor `components/dashboard/nav.tsx` for tokenized admin nav.
- [ ] Create admin page primitives in `components/dashboard/ui/`:
  - [ ] `page-shell.tsx`
  - [ ] `page-header.tsx`
  - [ ] `kpi-strip.tsx`
  - [ ] `filter-bar.tsx`
  - [ ] `data-table-shell.tsx`

Exit criteria:
- All admin routes render through a consistent shell/nav.

### Phase 1B: Portal Shell and Patterns (Days 2-3, parallel)
Status: `todo`

- [ ] Refactor `app/portal/layout.tsx` with dedicated portal shell primitives.
- [ ] Add portal navigation/header pattern for campaign-centric navigation.
- [ ] Create portal primitives in `components/portal/ui/`:
  - [ ] `portal-shell.tsx`
  - [ ] `portal-header.tsx`
  - [ ] `metric-card.tsx`
  - [ ] `status-panel.tsx`

Exit criteria:
- Portal pages have a distinct, consistent client UX identity.

### Phase 2A: Admin P0 Migrations (Days 4-6)
Status: `todo`

- [ ] Migrate `app/dashboard/submissions/page.tsx`
- [ ] Migrate `app/dashboard/contacts/page.tsx`
- [ ] Migrate `app/dashboard/users/page.tsx`
- [ ] Migrate `app/dashboard/campaigns/page.tsx`

Rules:
- Preserve existing data behavior and action handlers.
- Replace ad-hoc styling with admin primitives.

Exit criteria:
- P0 admin workflows share one pattern system and are regression-safe.

### Phase 2B: Portal P0 Migrations (Days 4-6, parallel)
Status: `todo`

- [ ] Migrate `app/portal/page.tsx`
- [ ] Migrate `app/portal/campaigns/page.tsx`
- [ ] Migrate `app/portal/campaigns/[id]/page.tsx`
- [ ] Migrate `app/portal/campaigns/[id]/responses/page.tsx`
- [ ] Migrate `app/portal/campaigns/[id]/analytics/page.tsx`

Rules:
- Keep response/analytics data contracts unchanged.
- Emphasize readability over admin density.

Exit criteria:
- Core client workflows have unified portal UX and no auth regressions.

### Phase 3: Detail Pages + Cross-Surface Hardening (Week 2)
Status: `todo`

- [ ] Admin detail-page consistency pass (`contacts`, `campaigns`, `assessments` details).
- [ ] Portal error/loading/empty-state consistency:
  - [ ] `app/portal/error.tsx`
  - [ ] `app/portal/loading.tsx`
  - [ ] `app/portal/campaigns/[id]/error.tsx`
  - [ ] `app/portal/campaigns/[id]/loading.tsx`
- [ ] Ensure no imports from `components/dashboard/*` inside portal routes.
- [ ] Ensure no imports from `components/portal/*` inside admin routes.

Exit criteria:
- Clear and enforced UI boundary between admin and portal.

### Phase 4: QA + Accessibility + Final Cleanup (Week 2)
Status: `todo`

- [ ] Keyboard/focus and contrast pass across both surfaces.
- [ ] Responsive pass (mobile/tablet/desktop) for dashboard and portal.
- [ ] Remove duplicate styles replaced by primitives.
- [ ] Lint and fix all new issues.

Exit criteria:
- `npm run lint` clean.
- Manual smoke test complete for both admin and portal P0 routes.

## Execution Order
1. Phase 0
2. Phase 1A + 1B (parallel)
3. Phase 2A + 2B (parallel)
4. Phase 3
5. Phase 4

## Immediate Build Queue (starting now)
- [ ] Create `components/ui/foundation/*` shared primitives.
- [ ] Add `--admin-*` and `--portal-*` token groups in `app/globals.css`.
- [ ] Refactor shell layers:
  - [ ] `app/dashboard/layout.tsx`
  - [ ] `app/portal/layout.tsx`
- [ ] Implement first migrated route per surface:
  - [ ] `app/dashboard/submissions/page.tsx`
  - [ ] `app/portal/campaigns/page.tsx`
- [ ] Run `npm run lint`.

## Definition of Done
- Split is real in code structure, not just visual styling.
- Admin and portal can evolve independently with shared low-level foundations only.
- P0 user workflows preserved while UX is materially improved.
