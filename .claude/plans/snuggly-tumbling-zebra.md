# Report Template: Page Breaks + PDF Section Visibility

## Context

The Chromium PDF renderer is already in place and working. This plan is about the **report template layer** — how the report HTML components are structured for clean PDF output, and how to configure which sections appear in web vs PDF from the admin dashboard.

Two problems:

1. **Page breaks split content mid-card** — competency cards, narrative insight blocks, and recommendation items get cut in half across PDF pages. CSS `break-inside: avoid-page` exists on `.assessment-web-report-card` but doesn't cover all elements (insight sub-cards are plain `<div>`s, recommendation `<li>`s have no protection, trait chart dimension groups can split).

2. **No per-output section control** — the 5 section toggles (`show_overall_classification`, etc.) apply identically to web and PDF. No way to say "show this on web but hide it in PDF." (Actions + Next Steps are already excluded from PDF via `includeActions=false` in document mode, but the 5 formal report sections have no web-vs-PDF distinction.)

---

## Part 1: Fix PDF page breaks (CSS + component classes)

Add CSS classes to currently unprotected elements, then add `break-inside: avoid` rules in the `@media print` block.

### `app/globals.css` — inside the existing `@media print` block (~line 1830)

Add these rules:

```css
.assessment-web-report-insight-card {
  break-inside: avoid-page;
}

.assessment-web-report-recommendation-item {
  break-inside: avoid-page;
}

.assessment-web-report-card-breakable {
  break-inside: auto;
}

.assessment-web-report-trait-group {
  break-inside: avoid-page;
}

.assessment-web-report-section {
  break-before: auto;
  break-after: auto;
}
```

- `insight-card`: protects each narrative insight `<div>` from splitting
- `recommendation-item`: protects each `<li>` in the recommendations list
- `card-breakable`: overrides `break-inside: avoid-page` on the recommendations wrapper card — allows the card itself to flow across pages while children stay intact
- `trait-group`: protects each dimension group in the trait profile chart
- `section`: allows natural page breaks between sections

### `components/reports/assessment-report-view.tsx`

- Line ~317 (narrative insight divs): Add class `assessment-web-report-insight-card` to each insight `<div>`
- Line ~338 (dev recommendations wrapper): Add `assessment-web-report-card-breakable` alongside existing `assessment-web-report-card`
- Line ~348 (recommendation `<li>`s): Add class `assessment-web-report-recommendation-item` to each `<li>`

### `components/reports/trait-profile-chart.tsx`

- Line ~140 (dimension group divs): Add class `assessment-web-report-trait-group` to each dimension group `<div>`

---

## Part 2: Add `pdf_hidden_sections` to ReportConfig

### `utils/assessments/experience-config.ts`

Define a type for section IDs (avoids circular imports with `assessment-report-sections.ts`):

```typescript
export type PdfHiddenSectionId =
  | 'overall_profile'
  | 'competency_cards'
  | 'percentile_benchmark'
  | 'narrative_insights'
  | 'development_recommendations'

const VALID_PDF_HIDDEN_SECTION_IDS: PdfHiddenSectionId[] = [
  'overall_profile',
  'competency_cards',
  'percentile_benchmark',
  'narrative_insights',
  'development_recommendations',
]
```

Add to `ReportConfig` type:

```typescript
pdf_hidden_sections: PdfHiddenSectionId[]
```

Add to `DEFAULT_REPORT_CONFIG`:

```typescript
pdf_hidden_sections: [],
```

Add to `normalizeReportConfig()`:

```typescript
pdf_hidden_sections: Array.isArray(value.pdf_hidden_sections)
  ? (value.pdf_hidden_sections as string[]).filter(
      (id): id is PdfHiddenSectionId =>
        VALID_PDF_HIDDEN_SECTION_IDS.includes(id as PdfHiddenSectionId)
    )
  : DEFAULT_REPORT_CONFIG.pdf_hidden_sections,
```

---

## Part 3: Extend section system for web/pdf mode

### `utils/reports/assessment-report-sections.ts`

Add optional `options` parameter to `getAssessmentReportSections()`:

```typescript
export function getAssessmentReportSections(
  reportConfig: Pick<ReportConfig, /* existing fields */ | 'pdf_hidden_sections'>,
  availability: AssessmentReportSectionAvailability,
  options?: { mode?: 'web' | 'pdf' }
): AssessmentReportSectionState[]
```

In the mapping logic, after computing `visible = enabledState[id] && availability[id]`, add:

```typescript
const hiddenInPdf = options?.mode === 'pdf' && reportConfig.pdf_hidden_sections.includes(id)
// ...
visible: enabledState[id] && availability[id] && !hiddenInPdf,
```

Fully backwards-compatible — callers that don't pass `options` get current behaviour.

---

## Part 4: Wire documentMode into section filtering

### `components/reports/assessment-report-view.tsx`

Change the `getAssessmentReportSections()` call (~line 131) to:

```typescript
const sectionState = getAssessmentReportSections(
  report.reportConfig,
  getAssessmentReportSectionAvailability(report),
  documentMode ? { mode: 'pdf' } : undefined
)
```

No other logic changes. The existing `sections.X.visible` checks throughout the JSX will automatically respect the PDF exclusions.

---

## Part 5: Admin UI for PDF section visibility

### `components/dashboard/config-editor/report-config-form.tsx`

Under the existing "Export" config section, when `pdf_enabled` is true, render a checkbox list:

```tsx
{visible.has('export') && value.pdf_enabled ? (
  <ConfigSection
    title="PDF section visibility"
    description="Uncheck sections you want to exclude from the PDF export."
  >
    {VALID_PDF_HIDDEN_SECTION_IDS.map((sectionId) => {
      const label = SECTION_LABEL_MAP[sectionId] // map section IDs to display names
      const isIncluded = !value.pdf_hidden_sections.includes(sectionId)
      return (
        <label key={sectionId} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isIncluded}
            onChange={() => {
              const next = isIncluded
                ? [...value.pdf_hidden_sections, sectionId]
                : value.pdf_hidden_sections.filter((id) => id !== sectionId)
              onChange({ ...value, pdf_hidden_sections: next })
            }}
          />
          <span className="text-sm">{label}</span>
        </label>
      )
    })}
  </ConfigSection>
) : null}
```

Section label map (inline or imported):
- `overall_profile` → "Overall profile"
- `competency_cards` → "Competency cards"
- `percentile_benchmark` → "Percentile benchmark"
- `narrative_insights` → "Narrative insights"
- `development_recommendations` → "Development recommendations"

---

## Files to modify

| File | Change |
|------|--------|
| `app/globals.css` | Add print CSS rules for insight cards, recommendation items, trait groups, breakable cards |
| `utils/assessments/experience-config.ts` | Add `PdfHiddenSectionId` type, `pdf_hidden_sections` to `ReportConfig`, defaults, normalizer |
| `utils/reports/assessment-report-sections.ts` | Add optional `mode` param to `getAssessmentReportSections()` |
| `components/reports/assessment-report-view.tsx` | Add CSS classes to unprotected elements; pass mode to section system |
| `components/reports/trait-profile-chart.tsx` | Add `assessment-web-report-trait-group` class to dimension groups |
| `components/dashboard/config-editor/report-config-form.tsx` | Add PDF section visibility checkboxes under export config |

## What stays the same

- Report document page (`app/document/reports/[reportType]/page.tsx`) — no changes
- Report assembly (`utils/reports/assemble-report-document.ts`) — untouched
- Chromium renderer (`utils/pdf/chromium-renderer.ts`) — untouched
- PDF API route (`app/api/reports/[reportType]/pdf/route.ts`) — same contract
- Existing section toggles work exactly as before for web view
- Database schema — `pdf_hidden_sections` stored in existing JSONB `report_config` column, no migration needed

## Verification

1. `npx tsc --noEmit` — type check passes
2. `npm test` — all tests pass
3. Local dev: generate PDF for an assessment report — verify no card splitting across pages
4. Admin dashboard: toggle PDF section visibility, regenerate PDF, confirm sections hidden/shown correctly
5. Verify web report still shows all sections regardless of `pdf_hidden_sections`
