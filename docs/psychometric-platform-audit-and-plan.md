# Psychometric Platform Audit & Implementation Plan

> **This document is the single source of truth** for the psychometric platform overhaul.
> Audit date: 2026-03-09. Covers the full scoring pipeline, statistical engine, norm group infrastructure, validation workflow, and dashboard UX.

---

## Canonical Terminology

All copy, labels, tooltips, headings, and button text in the psychometrics area must use these terms. No exceptions.

| Concept | **Canonical Term** | Replace These |
|---|---|---|
| Top-level grouping | **Dimension** | (already mostly consistent) |
| Measurable construct | **Trait** | "scale" in user-facing copy |
| Survey question (in psych context) | **Item** | "question" within the workspace only |
| Reference population | **Reference group** | "norm group", "comparison group", "comparison population" |
| Distribution statistics | **Benchmark statistics** | "norm stats", "norms" |
| Score range category | **Band** | "classification" (reserve for rule-based engine output only), "level" |
| Per-submission psychometric run | **Analysis run** | "validation run", "model check", "check", "run" |
| Internal data integrity check | **Score audit** | "Math QA", "verification", "diagnostic check" |
| Question-factor relationship | **Item loading** | "loading", "factor loading" |
| Score relative to reference group | **Benchmark score** | "z-score" in user-facing text (keep z-score in technical tables) |
| Relative standing | **Percentile rank** | "percentile" (keep as shorthand once established) |
| Internal consistency estimate | **Reliability** (α) | "scale consistency", "Cronbach's alpha" in user-facing copy (use α as shorthand once defined) |
| Remaining items correlation | **Item-scale correlation** | "CITC", "corrected item-total" in user-facing copy |

**Note:** "Question" remains the correct term on the Questions tab and throughout the rest of the dashboard. The psychometrics workspace uses "item" to signal a psychometric context — a one-line note in the workspace header makes this explicit.

---

## Executive Summary

The platform has **excellent mathematical foundations** — the statistical engine (`utils/stats/engine.ts`) is rigorous and correct. The architecture is clean with good separation of concerns. However, three critical bugs cause silent incorrect behaviour, the band threshold system has two contradictory definitions, and the UX is too dense for the guided, expert-endorsed experience we want.

This plan addresses all of it in six sequential phases.

---

## Part 1: Audit Findings

### 1.1 Mathematical Correctness

| Calculation | Status | Notes |
|---|---|---|
| Mean / SD / Variance | Correct | n-1 unbiased estimator |
| Percentiles (R type 7) | Correct | Matches SPSS/numpy defaults |
| Cronbach's alpha | Correct | k/(k-1) × (1 - ΣVarItems/VarTotal) |
| Alpha CI (Feldt 1965) | Correct | |
| CITC (rest-score method) | Correct | |
| SEM | Correct | SD × √(1 - α) |
| Welch's t-test | Correct | Unequal variances; Welch–Satterthwaite df |
| Cohen's d | Correct | Pooled SD |
| Normal CDF / quantile | Correct | Abramowitz & Stegun; Acklam approximation |
| Z-score | Correct | |
| **Reverse coding** | **Bug** | Hardcoded 5-point scale (`6 - value`) |
| **Band assignment** | **Bug** | Code uses [0-39/40-74/75-100]; seed data uses [0-33/34-66/67-100] |
| Verification tolerance | Marginal | `NORM_TOLERANCE = 0.001` too tight for 4dp rounding drift |

### 1.2 Critical Bugs (P0 — Fix Before Wide Deployment)

#### Bug 1: Hardcoded Reverse Coding Scale

**Location:** `utils/assessments/psychometric-structure.ts:81`

```typescript
// CURRENT (wrong for any non-5-point scale)
function reverseLikert(value: number) {
  return 6 - value
}

// CORRECT
function reverseLikert(value: number, scalePoints: number) {
  return (scalePoints + 1) - value
}
```

The formula `6 - value` is only correct for 5-point Likert scales. On a 7-point scale, `7` becomes `-1`. The assessment's `scoring_config.scale_config.points` is already in the DB but is not being read into the structure loader.

**Impact:** Any assessment using non-5-point scales has silently incorrect reverse-scored items.

#### Bug 2: Band Boundary Mismatch

**Locations:** `psychometric-scoring.ts:27-31`, `norm-computation.ts:23-27` (identical), vs migration seed data

| Source | Low | Mid | High |
|---|---|---|---|
| Code (`bandFromPercentile`) | 0–39 | 40–74 | 75–100 |
| Seed data (interpretation_rules) | 0–33 | 34–66 | 67–100 |

A score at the 36th percentile is `low` by the code but `mid` by interpretation rules.

**Fix:** Align `bandFromPercentile` to match seed data: `>= 67 = high`, `>= 34 = mid`, else `low`.
**Long-term fix:** Extract to shared module with configurable thresholds stored on the norm group row.

#### Bug 3: Verification Tolerance Causes False Failures

**Location:** `utils/services/psychometric-math-verification.ts:105`

```typescript
const NORM_TOLERANCE = 0.001  // too tight
// Fix:
const NORM_TOLERANCE = 0.005  // 5× max per-value rounding error from 4dp storage
```

---

### 1.3 High Priority Issues (P1)

#### Cohort Comparison Fails Silently

**Location:** `admin-assessment-analytics.ts`, `getCohortComparison`

The deep nested join does not check for Supabase errors before processing results. Fix: destructure and check `error` from every Supabase call; return `{ ok: false, error: 'query_failed' }` on failure.

#### Archived Assessments Can Contaminate Norm Computations

**Location:** `utils/services/norm-computation.ts`

`computeNormsFromSubmissions` fetches norm groups without checking `assessments.status`. Fix: after loading norm group, fetch `assessments.status` and return `{ ok: false, error: 'assessment_archived' }` if archived.

---

### 1.4 Architectural Issues (P2)

- **Duplicate `bandFromPercentile`**: Identical function in two files — should be a single shared module
- **Duplicate reverse coding flags**: Both `assessment_questions.is_reverse_coded` and `trait_question_mappings.reverse_scored` exist; the mapping flag is authoritative but there's no tool to sync them
- **No EFA/CFA item count validation**: An analysis run can launch with fewer than 3 items per scale
- **Sample size thresholds scattered**: Magic numbers (50, 200, 300) appear in multiple files without a central constant

---

### 1.5 UX Issues

- **Design system inconsistency**: The psychometrics area uses `psychometric-*` CSS classes and `backend-btn-*` form elements instead of shared dashboard components
- **Information density too high**: All sections in one long scroll with no grouping or progressive disclosure
- **No health status at a glance**: Users can't tell whether an assessment is ready without scrolling through everything
- **No guided workflow**: The workspace steps are informational text, not an interactive guide with completion tracking
- **Band thresholds not configurable**: Changing band boundaries requires a code change
- **Sample size warnings absent**: No warnings when n is too low for reliable estimates

---

## Part 2: Implementation Plan

### Phase 1 — Bug Fixes (No Schema Changes)

All four fixes are independent and can be done in parallel.

#### 1-A: Fix Reverse Coding

**File:** `utils/assessments/psychometric-structure.ts`

1. Change `reverseLikert(value)` signature to `reverseLikert(value, scalePoints)` → formula `(scalePoints + 1) - value`
2. In `loadAssessmentPsychometricStructure`, add `scoring_config` to the assessments fetch
3. Extract `scalePoints = scoringConfig?.scale_config?.points ?? 5`
4. Add `scalePoints: number` to the returned `PsychometricStructure` type
5. Update `resolveKeyedItemValue(item, responses, scalePoints = 5)` to pass `scalePoints` to `reverseLikert`
6. Update callers in `psychometric-scoring.ts` and `psychometric-math-verification.ts`

**Test:** 7-point scale case: `reverseLikert(7, 7) === 1`, `reverseLikert(1, 7) === 7`

#### 1-B: Fix Band Boundaries

**Files:** `psychometric-scoring.ts:27-31`, `norm-computation.ts:23-27`

```typescript
function bandFromPercentile(percentile: number | null): string | null {
  if (percentile === null) return null
  if (percentile >= 67) return 'high'
  if (percentile >= 34) return 'mid'
  return 'low'
}
```

**Test:** 0→low, 33→low, 34→mid, 66→mid, 67→high, 100→high.

#### 1-C: Fix Verification Tolerance

**File:** `utils/services/psychometric-math-verification.ts:105`

Change `NORM_TOLERANCE = 0.001` to `NORM_TOLERANCE = 0.005`. Add comment: `// 5× max per-value rounding error from 4dp storage`

#### 1-D: Fix Cohort Comparison Error Handling

**File:** `utils/services/admin-assessment-analytics.ts`, `getCohortComparison`

Destructure `error` from every Supabase call inside the function. Return `{ ok: false, error: 'query_failed' }` rather than proceeding with null data.

---

### Phase 2 — Architecture Cleanup (One Schema Migration)

#### 2-A: Shared Band Module

**New file:** `utils/assessments/psychometric-bands.ts`

```typescript
export const DEFAULT_BAND_THRESHOLDS = {
  low: { max: 33 }, mid: { min: 34, max: 66 }, high: { min: 67 }
} as const
export function bandFromPercentile(p, thresholds = DEFAULT_BAND_THRESHOLDS): string | null
```

Remove duplicate `bandFromPercentile` from both service files; import from shared module.

#### 2-B: Sample Size Constants Module

**New file:** `utils/assessments/psychometric-sample-thresholds.ts`

```typescript
export const SAMPLE_THRESHOLDS = {
  ALPHA_MINIMUM: 50,       // below this: unreliable estimates
  ALPHA_STABLE: 200,       // above this: stable alpha
  EFA_MINIMUM: 100,        // below this: EFA not recommended
  EFA_STABLE: 300,         // above this: stable EFA
  CFA_MINIMUM: 200,        // below this: CFA not recommended
  N_TO_ITEMS_RATIO: 10,    // minimum respondents per item for CFA
} as const
export function sampleAdequacy(n, type: 'alpha'|'efa'|'cfa'): 'insufficient'|'caution'|'adequate'
```

Replace all magic numbers in norm-computation, analysis-runs, and UI.

#### 2-C: Archive Guard in Norm Computation

**File:** `utils/services/norm-computation.ts`

After loading norm group, check `assessments.status`. Return `{ ok: false, error: 'assessment_archived' as const }` if archived. Apply to both `computeNormsFromSubmissions` and `reScoreSessionsForNormGroup`.

#### 2-D: Reverse Coding Sync API

**New route:** `POST /api/admin/assessments/[id]/psychometrics/sync-reverse-coding`

Bulk-writes `trait_question_mappings.reverse_scored = assessment_questions.is_reverse_coded` for all diverging mappings. Returns `{ updated: n }`.

#### 2-E: Schema Migration

**New file:** `supabase/migrations/20260310090000_psychometric_band_config.sql`

```sql
ALTER TABLE public.norm_groups
  ADD COLUMN IF NOT EXISTS band_thresholds jsonb;

ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS validation_stage text
  NOT NULL DEFAULT 'pilot'
  CHECK (validation_stage IN ('pilot', 'analysis', 'certified', 'review'));
```

#### 2-F: EFA Item Count Preflight

**File:** `utils/services/psychometric-analysis-runs.ts`, `createPsychometricAnalysisRun`

Before inserting, check each scale has >= 3 items. Store `preflight_warnings` in `input_snapshot`. Run still proceeds — warnings surface in UI but do not block.

---

### Phase 3 — Design System Alignment

The psychometrics area must use the same components as the rest of the dashboard. The `psychometric-*` custom CSS is kept **only** for elements with no dashboard equivalent. Everything else switches to shared components.

#### Reusable Components (Do Not Recreate)

- `components/dashboard/ui/page-shell.tsx` → `DashboardPageShell`
- `components/dashboard/ui/page-header.tsx` → `DashboardPageHeader`
- `components/dashboard/ui/kpi-strip.tsx` → `DashboardKpiStrip`
- `components/dashboard/ui/filter-bar.tsx` → `DashboardFilterBar`
- `components/dashboard/ui/data-table-shell.tsx` → `DashboardDataTableShell`
- `components/ui/foundation/button.tsx` → `FoundationButton`
- `components/ui/foundation/field.tsx` → `FoundationInput`, `FoundationSelect`
- `components/ui/foundation/table-frame.tsx` → `FoundationTableFrame`
- `components/ui/badge.tsx` → `Badge` (extend with signal variants)
- `components/ui/action-menu.tsx` → `ActionMenu` for row-level destructive actions

#### 3-A: Page Layout

Replace `<div className="backend-page-content">` → `<DashboardPageShell>`. Custom hero/title block → `<DashboardPageHeader>`. KPI metrics → `<DashboardKpiStrip>`.

#### 3-B: Tables

All tables switch from `psychometric-data-table` to:

```jsx
<DashboardDataTableShell>
  <table className="w-full text-left text-sm">
    <thead className="bg-[rgba(255,255,255,0.68)] text-xs uppercase tracking-[0.08em]">
      <tr><th className="px-4 py-3">...</th></tr>
    </thead>
    <tbody>
      <tr className="border-t border-[rgba(103,127,159,0.12)]">
        <td className="px-4 py-3">...</td>
      </tr>
    </tbody>
  </table>
</DashboardDataTableShell>
```

**Affected:** item diagnostics table, dimension reliability table, factor loadings table, benchmark statistics display, interpretation rules table.

#### 3-C: Buttons and Inputs

- `backend-btn-primary` / `backend-btn-secondary` → `<FoundationButton variant="primary|secondary" size="sm|md">`
- `backend-input` → `<FoundationInput>` or `<FoundationSelect>`
- Browser-native `confirm()` → inline confirmation pattern

#### 3-D: Status Badges

Replace `psychometric-status-chip` + colour variants with the shared `<Badge>` component.

**New variants added to `components/ui/badge.tsx`:**
```typescript
'signal-green': 'bg-[rgba(36,129,99,0.12)] text-[#216c56] ring-[rgba(36,129,99,0.2)]',
'signal-amber': 'bg-[rgba(217,149,33,0.14)] text-[#8a5512] ring-[rgba(217,149,33,0.2)]',
'signal-red':   'bg-[rgba(171,58,75,0.12)] text-[#8d2d3b] ring-[rgba(171,58,75,0.2)]',
'signal-blue':  'bg-[rgba(47,95,153,0.12)] text-[#1a3a6b] ring-[rgba(47,95,153,0.2)]',
'signal-grey':  'bg-[rgba(108,136,174,0.14)] text-[#4a5e78] ring-[rgba(108,136,174,0.2)]',
```

#### 3-E: Section Containers

Replace `backend-section` with `<FoundationSurface>` where appropriate, or:
```jsx
<section className="rounded-[28px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
```

---

### Phase 4 — Guided 0-to-100 Workflow

#### The Six Stages

```
STAGE 1: Structure
  Conditions: ≥1 dimension, ≥1 trait, ≥1 item mapped per trait

STAGE 2: Reference Groups
  Conditions: ≥1 reference group with n ≥ 50, benchmarks computed
  Requires: Stage 1 complete

STAGE 3: Interpretation
  Conditions: ≥1 band rule per trait (optional but recommended)
  Requires: Stage 1 complete

STAGE 4: Collection
  Informational — shows live response count and adequacy signal
  Green: n ≥ EFA_STABLE (300) | Amber: n ≥ EFA_MINIMUM (100) | Red: n < EFA_MINIMUM

STAGE 5: Analysis
  Conditions: ≥1 completed analysis run
  Requires: Stage 1 complete, n ≥ EFA_MINIMUM

STAGE 6: Certification
  Conditions: ≥1 approved analysis run, n ≥ CFA_MINIMUM, all scale α ≥ 0.70
  Requires: Stage 5 complete
```

#### 4-A: Stage Progress Component

New `_components/stage-progress.tsx` — a horizontal stepper at the top of the psychometrics page:
```
[1 Structure ✓] → [2 Reference groups ✓] → [3 Interpretation ✓] → [4 Collection n=312 ✓] → [5 Analysis ●] → [6 Certification ○]
```

- Completed stages: solid green dot + label
- Current stage: filled circle, bold label, subtle highlight
- Locked stages: empty circle, muted label

#### 4-B: Section Navigation

The page splits into four panels controlled by `?section=setup|groups|analysis|certification` query param.

| Tab | Contents |
|---|---|
| **Setup** | Scoring engine selector, Dimensions, Traits, Item mappings |
| **Reference groups** | Reference group builder, Benchmark statistics, Interpretation bands |
| **Item analysis** | Item health table, Dimension reliability, Score audit |
| **Certification** | Analysis runs, Run detail links, Approve button |

#### 4-C: Assessment Health Card

New `_components/assessment-health-card.tsx`:

```
Psychometric health  [75% — Analysis]
Items: 18 mapped  ·  Reliability: α 0.81  ·  Reference group: n = 312  ·  Last run: 3 days ago
```

Health score (0–100, in steps of 20):
- +20: Trait scales configured (≥1 dimension, ≥1 trait, ≥1 mapping)
- +20: All scales α ≥ 0.70 (from latest run or live analytics)
- +20: Global reference group n ≥ 200
- +20: No critical structure warnings (no unmapped items, no reverse coding conflicts)
- +20: Approved analysis run exists

---

### Phase 5 — Item Analysis Improvements

#### 5-A: Item Health Traffic Light

Add `healthSignal: 'green' | 'amber' | 'red'` to `ItemAnalytics`:

```typescript
function itemHealthSignal(item): 'green' | 'amber' | 'red' {
  if (item.citc !== null && item.citc < 0.2) return 'red'
  if (item.missingRate !== null && item.missingRate >= 0.15) return 'red'
  if (item.citc !== null && item.citc < 0.3) return 'amber'
  if (item.missingRate !== null && item.missingRate >= 0.05) return 'amber'
  if (item.ceilingPct >= 0.5) return 'amber'
  if (item.floorPct >= 0.5) return 'amber'
  return 'green'
}
```

#### 5-B: Item Difficulty and Discrimination

Add to `ItemAnalytics`:
- **`pValue`**: Classical difficulty `(mean - 1) / (scalePoints - 1)`. Ideal range 0.30–0.70.
- **`discriminationIndex`**: Upper-lower 27% method. `(meanTop27 - meanBottom27) / (scalePoints - 1)`. Ideal ≥ 0.30.

#### 5-C: Sample Size Warnings

In the Reference groups panel, show inline adequacy banners:
- **Red (n < 50):** "Sample too small for stable reliability estimates. Collect at least 50 responses before computing benchmarks."
- **Amber (50 ≤ n < 200):** "Provisional benchmarks. Confidence intervals will be wide. Aim for n ≥ 200 for stable estimates."
- **Green (n ≥ 200):** No banner.

On the Certification panel:
- **Red (n < 100):** "Insufficient data for factor analysis. Need n ≥ 100."
- **Amber (100 ≤ n < 300):** "Factor analysis is possible but results may be unstable."

#### 5-D: Reverse Coding Sync UI

In the Setup panel, when `structure.warnings` contains `reverse_scoring_mismatch` warnings, show:

```
N items have a mismatch between the item-level reverse coding flag and the trait mapping flag.
The trait mapping is used for scoring. [Sync item flags to match trait mappings →]
```

The button calls `POST .../sync-reverse-coding` and refreshes.

---

### Phase 6 — Certification Flow

#### 6-A: Validation Stage Computation

**File:** `utils/services/psychometric-analysis-runs.ts`

Add `computeValidationStage(adminClient, assessmentId): Promise<'pilot'|'analysis'|'certified'|'review'>`:
- `'pilot'`: no reference group with n ≥ 50, OR no completed run
- `'analysis'`: reference group n ≥ 50, at least one completed run
- `'certified'`: approved run exists AND reference group n ≥ 200 AND all scale α ≥ 0.70
- `'review'`: previously certified but n has grown > 50% since approval

Cron job at `app/api/cron/psychometric-analysis-jobs/route.ts` calls this for all active assessments and writes `assessments.validation_stage`.

#### 6-B: Approve Button Pre-flight

**File:** `_components/validation-run-approve-button.tsx`

Before approving, fetch run's scale diagnostics. If any scale α < 0.60 OR reference group n < 200, show inline confirmation card (not browser dialog):

```
Before approving this run:
⚠ One scale has reliability below 0.60 (α = 0.54)
⚠ Reference group has n = 145 (200 recommended for stable benchmarks)

Approving marks this assessment as certified. Are you sure?
[Cancel]  [Approve anyway]
```

#### 6-C: Supersession Chain

**File:** `utils/services/psychometric-analysis-runs.ts`, `approvePsychometricAnalysisRun`

When a run is approved, update all previous approved runs for the same assessment to `superseded`:
```typescript
await adminClient
  .from('psychometric_analysis_runs')
  .update({ status: 'superseded' })
  .eq('assessment_id', assessmentId)
  .eq('status', 'approved')
  .neq('id', runId)
```

#### 6-D: Technical Export

**New route:** `GET /api/admin/assessments/[id]/psychometrics/export`

Returns downloadable JSON with:
1. Assessment metadata (name, key, scale points, validation stage)
2. Full structure (dimensions, traits, items with weights and coding)
3. Latest item analytics (p-values, CITC, discrimination, reliability)
4. Benchmark statistics for all reference groups
5. Interpretation bands
6. Latest approved analysis run (scale diagnostics, fit indices, factor loadings)

`Content-Disposition: attachment; filename="[assessment-key]-technical-manual.json"`

---

## Part 3: Critical Files Reference

| File | Phase | Changes |
|---|---|---|
| `utils/assessments/psychometric-structure.ts` | 1-A | Reverse coding scale param, scalePoints on structure |
| `utils/assessments/psychometric-scoring.ts` | 1-B, 2-A | Band cutpoints → shared module |
| `utils/services/norm-computation.ts` | 1-B, 2-A, 2-C | Band cutpoints, shared module, archive guard |
| `utils/services/psychometric-math-verification.ts` | 1-C | Norm tolerance |
| `utils/services/admin-assessment-analytics.ts` | 1-D, 5-A, 5-B | Error handling, healthSignal, p-value, ULD27 |
| `utils/services/psychometric-analysis-runs.ts` | 2-F, 6-A, 6-C | Preflight, stage computation, supersession |
| `utils/assessments/psychometric-bands.ts` | 2-A | New shared module |
| `utils/assessments/psychometric-sample-thresholds.ts` | 2-B | New constants module |
| `supabase/migrations/20260310090000_*.sql` | 2-E | band_thresholds, validation_stage columns |
| `app/dashboard/assessments/[id]/psychometrics/page.tsx` | 3-A, 4-B, 4-C | Full page restructure |
| `app/dashboard/assessments/[id]/psychometrics/_components/` (all) | 3-B/C/D/E | Design system alignment |
| `components/ui/badge.tsx` | 3-D | Add signal-* variants |
| New: `_components/stage-progress.tsx` | 4-A | Stage stepper |
| New: `_components/section-nav.tsx` | 4-B | Panel tabs |
| New: `_components/assessment-health-card.tsx` | 4-C | Health score card |
| New: `app/api/admin/assessments/[id]/psychometrics/export/route.ts` | 6-D | Technical export |
| New: `app/api/admin/assessments/[id]/psychometrics/sync-reverse-coding/route.ts` | 2-D | Sync flags |
| `app/api/cron/psychometric-analysis-jobs/route.ts` | 6-A | Compute validation stage |

---

## Part 4: Testing Requirements

### After Phase 1 (Bug Fixes)
```bash
npx vitest run __tests__/unit/assessments/psychometric-structure.test.ts
npx vitest run __tests__/unit/services/psychometric-math-verification.test.ts
npx vitest run __tests__/unit/services/admin-assessment-analytics.test.ts
npx tsc --noEmit
```
- Confirm `reverseLikert(7, 7) === 1` (7-point scale test)
- Confirm `bandFromPercentile(34) === 'mid'` (was 'low' before fix)
- Confirm `bandFromPercentile(67) === 'high'` (was 'mid' before fix)

### After Phase 3 (Design System)
- Visual check: psychometrics page tables match assessment list table style
- Visual check: all buttons use `FoundationButton` shape/size
- No `backend-btn-*` or `psychometric-data-table` class names in `_components/` files (grep check)

### After Phase 4 (Workflow)
- New assessment with no dimensions → stage progress shows Stage 1 active, stages 2–6 locked
- After creating dimension + trait + mapping → Stage 1 shows complete
- After creating reference group with n ≥ 50 and computing benchmarks → Stage 2 complete
- Health card shows correct score and stage label

### After Phase 6 (Certification)
- Approve a run with α < 0.60 → pre-flight warning appears
- Approve run → previous approved run status changes to `superseded`
- Download technical export → JSON contains all six data sections
- `assessments.validation_stage` updates correctly via cron or manual trigger

---

## Part 5: Psychometric Principles Checklist

| Principle | Status | Phase |
|---|---|---|
| Correct reverse coding | Bug (hardcoded scale) | 1-A |
| Cronbach's alpha + CI | Done | Done |
| CITC (rest-score) | Done | Done |
| Item difficulty (p-value) | Missing | 5-B |
| Item discrimination (ULD27) | Missing | 5-B |
| SEM | Done | Done |
| Norm-referenced scoring | Done | Done |
| Percentile bands | Bug (mismatched) | 1-B |
| Configurable band thresholds | Partially (DB column added) | 2-E |
| Sample size adequacy warnings | Missing | 5-C |
| EFA readiness preflight | Missing | 2-F |
| Formal validation stage | Missing | 6-A |
| Technical manual export | Missing | 6-D |
| Approval pre-flight checks | Missing | 6-B |
| Guided 6-stage workflow | Missing | 4-A/B/C |
| Design system consistency | Missing | Phase 3 |
| Reverse coding sync tool | Missing | 2-D |
