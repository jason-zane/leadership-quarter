# Assessment Cutover Recovery Plan

## Summary

This document captures the current assessment-platform state, why the split happened, and the safest path to finish the cutover.

The important context is:

- The original `assessments` area was the old system.
- `assessments-v2` was created as the rebuild workspace.
- The rebuild was intended to become the new default product.
- After that, the rebuilt system was supposed to be renamed back to plain `assessments`.
- The old legacy system was then supposed to be removed.

That cutover only completed partially. The result is a mixed repo containing:

- legacy assessment code
- rebuilt V2 implementation code
- canonical wrappers and delegating routes
- duplicate `/v2` admin APIs and route trees
- runtime and report compatibility branches that still expose both `assessment` and `assessment_v2`

This is not just a naming problem. It is a cutover-state problem.

## Why The Split Happened

The split came from a partially completed migration, not from a product decision to keep two systems.

### Intended migration

1. Build the old system in `app/dashboard/assessments`.
2. Duplicate into `app/dashboard/assessments-v2`.
3. Rebuild the assessment platform inside `assessments-v2`.
4. Make the rebuilt V2 system the new default.
5. Rename the rebuilt system back to `assessments`.
6. Delete the old legacy system later.

### What actually happened

1. The richer rebuilt system was successfully developed inside `assessments-v2`.
2. Canonical routes and canonical APIs were introduced, but only some of them became the true owners.
3. Many canonical routes were turned into wrappers or re-exports into `assessments-v2`.
4. Duplicate `/api/admin/assessments/[id]/v2/*` APIs remained live beside canonical APIs.
5. Report/runtime compatibility stayed live as if it were still part of the normal product path.
6. Old legacy behavior was not fully deleted.

### Current consequence

There are three overlapping layers:

- `legacy`: old assessment code and classic report behavior
- `rebuilt V2`: the richer implementation that should have become the final system
- `cutover glue`: wrappers, redirects, duplicate APIs, and compatibility branches

The cleanup job is therefore:

- finish the cutover
- then remove duplication
- then rename internals

Not:

- rename everything called `v2` immediately

## Current System Map

### Canonical route surface

These are the product-facing routes that should remain:

- `/dashboard/assessments/[id]/*`
- `/api/admin/assessments/[id]/*`
- `/assess/p/[assessmentKey]`
- `/assess/i/[token]`
- `/assess/c/[slug]/[campaignSlug]`
- `/assess/r/assessment`
- `/document/reports/assessment`

### Rebuilt implementation still carrying V2 names

These are largely the real current system:

- `utils/assessments/v2-question-bank.ts`
- `utils/assessments/v2-scoring.ts`
- `utils/services/assessment-runtime-v2.ts`
- `utils/services/assessment-v2-definition.ts`
- `utils/assessments/v2-report-template.ts`
- `utils/reports/v2-block-data-resolvers.ts`
- `utils/reports/v2-report-inheritance.ts`
- `utils/services/v2-submission-report.ts`
- `components/reports/v2/*`
- many pages under `app/dashboard/assessments-v2/[id]/*`

### Transitional duplication still present

- `/dashboard/assessments-v2/*`
- `/dashboard/assessments/[id]/v2/*`
- `/api/admin/assessments/[id]/v2/*`
- `assessment_v2` report tokens
- `/assess/r/assessment-v2`
- old `engine=v2` compatibility behavior

### Legacy behavior still present

- classic assessment report view and older report assembly paths
- older admin pages or helpers that predate the question-bank / scoring-config / block-template model

## Workflow Matrix

### Admin authoring

| Workflow | Canonical route | Actual implementation now | Status |
|---|---|---|---|
| Overview | `/dashboard/assessments/[id]` | canonical route delegates to `assessments-v2` overview | partially cut over |
| Questions | `/dashboard/assessments/[id]/questions` | canonical route delegates to `assessments-v2` questions editor | partially cut over |
| Scoring | `/dashboard/assessments/[id]/scoring` | canonical route delegates to `assessments-v2` scoring editor | partially cut over |
| Psychometrics | `/dashboard/assessments/[id]/psychometrics` | canonical route delegates to `assessments-v2` psychometrics editor | partially cut over |
| Reports list | `/dashboard/assessments/[id]/reports` | canonical route is more direct, but V2 service naming still underneath | mostly cut over |
| Report builder | `/dashboard/assessments/[id]/reports/[variantId]` | canonical route with V2 internals | mostly cut over |
| Responses | `/dashboard/assessments/[id]/responses` | canonical route delegates to V2 responses workspace | partially cut over |
| Response detail | `/dashboard/assessments/[id]/responses/[submissionId]` | canonical route delegates to V2 detail view | partially cut over |

### Public assessment delivery

| Workflow | Canonical route | Runtime/service path | Status |
|---|---|---|---|
| Public assessment | `/assess/p/[assessmentKey]` | canonical runtime wrapper -> V2 runtime | mostly canonical |
| Invitation assessment | `/assess/i/[token]` | canonical runtime wrapper -> V2 runtime | mostly canonical |
| Campaign assessment | `/assess/c/[slug]/[campaignSlug]` | canonical runtime wrapper -> V2 runtime | mostly canonical |

### Report access and rendering

| Workflow | Canonical route | Actual implementation now | Status |
|---|---|---|---|
| Report view | `/assess/r/assessment` | V2 submission report + V2 block renderer | behaviorally canonical, compatibility still present |
| Report document | `/document/reports/assessment` | V2 submission report + V2 block renderer | canonical |
| PDF | `/api/reports/assessment/pdf` | document route + report assembly | canonical |

### Campaign and portal response access

| Workflow | Route surface | Actual behavior now | Status |
|---|---|---|---|
| Campaign responses | dashboard campaigns routes | uses canonical assessment report links | mostly canonical |
| Portal participants | portal participant routes | uses canonical assessment report links | mostly canonical |
| Portal campaign responses | portal campaign routes | uses canonical assessment report links | mostly canonical |

## Keep / Collapse / Compatibility / Delete-Later Map

### Keep as current implementation

These are the rebuilt product and should be preserved:

- V2 question bank model
- V2 scoring model
- V2 runtime/definition assembly
- V2 report template + submission report + block rendering
- richer question/scoring/response/report builder UIs

### Collapse under canonical route/API surface

These should become the only owned entry points:

- `/dashboard/assessments/[id]/*`
- `/api/admin/assessments/[id]/*`
- `/assess/*`
- `/assess/r/assessment`
- `/document/reports/assessment`

### Keep only as temporary compatibility

These should survive only during transition:

- `assessment_v2` token acceptance
- `/assess/r/assessment-v2` route acceptance
- `/dashboard/assessments/[id]/v2/*`
- `/api/admin/assessments/[id]/v2/*`
- canonical pages that still re-export V2 pages

### Delete later

Delete only after canonical routes and APIs own the real implementation directly:

- `app/dashboard/assessments-v2/*`
- `app/dashboard/assessments/[id]/v2/*`
- `app/api/admin/assessments/[id]/v2/*`
- live emission of:
  - `assessment_v2`
  - `assessment-v2`
  - `engine=v2`

## Phase Plan

### Phase 1: Overview + Questions

Objective:

- canonical overview owns its implementation directly
- canonical questions owns its implementation directly
- both use canonical APIs only

Changes:

- copy overview implementation from `assessments-v2` into canonical overview page
- copy questions implementation from `assessments-v2` into canonical questions page
- preserve richer question-bank editor behavior
- stop canonical-to-V2 route re-exports for these screens

Acceptance:

- no re-export remains for overview/questions
- overview and questions stay inside canonical route space
- canonical questions page uses only canonical questions API

### Phase 2: Scoring + Psychometrics

Objective:

- canonical scoring owns its implementation directly
- canonical psychometrics owns its implementation directly

Changes:

- move scoring implementation into canonical scoring page
- preserve derived outcomes, archetypes, and richer scoring behavior
- move psychometrics implementation into canonical psychometrics page
- stop canonical-to-V2 re-exports for these screens

Acceptance:

- no re-export remains for scoring/psychometrics
- canonical pages use only canonical scoring/psychometrics APIs

### Phase 3: Responses + Response Detail

Objective:

- canonical responses list and detail own the richer response workspace

Changes:

- move V2 responses list implementation into canonical responses page
- move V2 response detail implementation into canonical detail page
- keep canonical report links only

Acceptance:

- no canonical response page re-exports V2 pages
- response detail reports tab uses `/assess/r/assessment`

### Phase 4: Reports List + Builder Stabilization

Objective:

- reports list and builder are fully canonical at the route level

Changes:

- keep canonical reports list and builder as source of truth
- port any remaining V2-only list/builder behavior into canonical files
- stop editing or relying on `assessments-v2` report pages

Acceptance:

- reports list and builder live only under canonical route ownership
- no active links point to `assessments-v2/.../reports`

### Phase 5: Canonical API Convergence

Objective:

- all active authoring pages call canonical admin APIs only

Changes:

- verify no active page fetches `/api/admin/assessments/[id]/v2/*`
- remove residual `/v2` API fetches
- keep `/v2` API routes only as temporary compatibility until routes are fully cleaned up

Acceptance:

- repo search shows no active assessment authoring page calling `/v2` admin APIs

### Phase 6: Route Tree Cleanup

Objective:

- one admin route tree remains

Changes:

- delete `/dashboard/assessments/[id]/v2/*` redirect wrappers first
- delete `/dashboard/assessments-v2/*` after canonical pages own their implementations directly

Acceptance:

- only `/dashboard/assessments/[id]/*` remains as the admin route tree

### Phase 7: Report Compatibility Cleanup

Objective:

- one report identity remains

Changes:

- remove acceptance of `assessment-v2` route path once old links are no longer needed
- remove `assessment_v2` token compatibility once no external emitters rely on it
- remove `assessment_v2` references from selector/helper types

Acceptance:

- only canonical assessment report links are accepted and emitted

### Phase 8: Internal Naming Cleanup

Objective:

- the rebuilt implementation no longer carries V2 names on the live path

Changes:

- rename surviving V2 internals after behavior is fully singular

Acceptance:

- remaining `V2*` names are limited to historical artifacts or tests only

## Verification Strategy

### Automated gates

Run after each phase:

- runtime public/invitation/campaign tests
- response-experience tests
- report-access tests
- assemble-report-document tests
- admin assessment workflow tests
- portal campaign/participants tests

### Manual workflow checks

Run after each phase:

1. open assessment overview
2. open questions
3. open scoring
4. open psychometrics
5. open reports and report builder
6. open responses and response detail
7. submit public assessment
8. submit invitation assessment
9. submit campaign assessment
10. open report from admin response
11. open report from campaign response
12. open report from portal participant

## Definition Of Done

The assessment cutover is complete when:

- canonical admin routes own their implementations directly
- canonical admin pages call only canonical admin APIs
- `/dashboard/assessments-v2/*` is gone
- `/dashboard/assessments/[id]/v2/*` is gone
- `/api/admin/assessments/[id]/v2/*` is gone
- all newly emitted report links are `/assess/r/assessment`
- no active route depends on `engine=v2`
- classic legacy assessment/report behavior is either removed or explicitly isolated
- only then are surviving V2 internals renamed
