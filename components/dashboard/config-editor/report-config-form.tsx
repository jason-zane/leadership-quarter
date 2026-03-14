import type { ChangeEvent, ReactNode } from 'react'
import {
  type ReportConfig,
  VALID_PDF_HIDDEN_SECTION_IDS,
} from '@/utils/assessments/experience-config'
import { ConfigSection } from '@/components/dashboard/config-editor/config-section'
import { FieldHint } from '@/components/dashboard/config-editor/field-hint'
import { getAssessmentReportSectionLabelMap } from '@/utils/reports/assessment-report-sections'

export type ReportFieldKey = keyof ReportConfig

export const REPORT_SECTION_ITEMS = [
  { id: 'header', label: 'Header' },
  { id: 'sections', label: 'Layout' },
  { id: 'competencies', label: 'Profile Copy' },
  { id: 'next', label: 'Next Step' },
  { id: 'export', label: 'Export' },
] as const

export type ReportSectionKey = (typeof REPORT_SECTION_ITEMS)[number]['id']

type Props = {
  value: ReportConfig
  onChange: (value: ReportConfig) => void
  errors?: Partial<Record<ReportFieldKey, string>>
  visibleSections?: ReportSectionKey[]
}

function setField<K extends keyof ReportConfig>(
  value: ReportConfig,
  onChange: (next: ReportConfig) => void,
  key: K,
  nextValue: ReportConfig[K]
) {
  onChange({ ...value, [key]: nextValue })
}

function inputClass(hasError?: boolean) {
  return `w-full rounded-md border px-3 py-2 text-sm dark:bg-zinc-950 ${
    hasError ? 'border-red-400 dark:border-red-700' : 'border-zinc-300 dark:border-zinc-700'
  }`
}

function FieldWrapper({
  label,
  where,
  error,
  children,
}: {
  label: string
  where: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      {children}
      <FieldHint where={where} />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </label>
  )
}

export function ReportConfigForm({ value, onChange, errors = {}, visibleSections }: Props) {
  const visible = new Set<ReportSectionKey>(visibleSections ?? REPORT_SECTION_ITEMS.map((section) => section.id))
  const pdfSectionLabels = getAssessmentReportSectionLabelMap(value)

  const handleString = (key: keyof ReportConfig) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setField(value, onChange, key, event.target.value as ReportConfig[typeof key])
  }

  const handleBool = (key: keyof ReportConfig) => (event: ChangeEvent<HTMLSelectElement>) => {
    setField(value, onChange, key, (event.target.value === 'true') as ReportConfig[typeof key])
  }

  return (
    <div className="space-y-4">
      {visible.has('header') ? (
        <ConfigSection title="Report header" description="Main heading and support copy shown on report pages.">
          <FieldWrapper label="Title" where="Top report heading." error={errors.title}>
            <input value={value.title} onChange={handleString('title')} className={inputClass(Boolean(errors.title))} />
          </FieldWrapper>
          <FieldWrapper label="Subtitle" where="Support copy under report title." error={errors.subtitle}>
            <textarea value={value.subtitle} onChange={handleString('subtitle')} rows={2} className={inputClass(Boolean(errors.subtitle))} />
          </FieldWrapper>
        </ConfigSection>
      ) : null}

      {visible.has('sections') ? (
        <ConfigSection
          title="Report layout"
          description="Choose the report style first, then decide which result sections people should actually see."
        >
          <FieldWrapper label="Report template" where="Controls the overall assessment report layout." error={errors.report_template}>
            <select
              value={value.report_template}
              onChange={(event) =>
                setField(value, onChange, 'report_template', event.target.value as ReportConfig['report_template'])
              }
              className={inputClass(Boolean(errors.report_template))}
            >
              <option value="default">Default assessment report</option>
              <option value="sten_profile">STEN profile report</option>
            </select>
          </FieldWrapper>
          {value.report_template === 'sten_profile' ? (
            <>
              <FieldWrapper label="No-norm fallback" where="What to do when STEN norms are not yet available." error={errors.sten_fallback_mode}>
                <select
                  value={value.sten_fallback_mode}
                  onChange={(event) =>
                    setField(
                      value,
                      onChange,
                      'sten_fallback_mode',
                      event.target.value as ReportConfig['sten_fallback_mode']
                    )
                  }
                  className={inputClass(Boolean(errors.sten_fallback_mode))}
                >
                  <option value="raw">Show provisional raw profile</option>
                  <option value="hide_until_norms">Hide profile until norms exist</option>
                </select>
              </FieldWrapper>
              <FieldWrapper label="Profile card scope" where="Which profile levels the STEN report should render." error={errors.profile_card_scope}>
                <select
                  value={value.profile_card_scope}
                  onChange={(event) =>
                    setField(
                      value,
                      onChange,
                      'profile_card_scope',
                      event.target.value as ReportConfig['profile_card_scope']
                    )
                  }
                  className={inputClass(Boolean(errors.profile_card_scope))}
                >
                  <option value="dimension">Competencies only</option>
                  <option value="trait">Traits only</option>
                  <option value="both">Competencies and traits</option>
                </select>
              </FieldWrapper>
            </>
          ) : null}
          <FieldWrapper label="Show overall profile" where="Current profile summary block." error={errors.show_overall_classification}>
            <select value={String(value.show_overall_classification)} onChange={handleBool('show_overall_classification')} className={inputClass(Boolean(errors.show_overall_classification))}>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </FieldWrapper>
          <FieldWrapper label="Show competency cards" where="Descriptor cards for each assessment dimension." error={errors.show_dimension_scores}>
            <select value={String(value.show_dimension_scores)} onChange={handleBool('show_dimension_scores')} className={inputClass(Boolean(errors.show_dimension_scores))}>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </FieldWrapper>
          <FieldWrapper label="Show percentile benchmark" where="Percentile comparison against the current norm group." error={errors.show_trait_scores}>
            <select value={String(value.show_trait_scores)} onChange={handleBool('show_trait_scores')} className={inputClass(Boolean(errors.show_trait_scores))}>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </FieldWrapper>
          <FieldWrapper label="Show narrative insights" where="Interpretation rules derived from the percentile benchmark." error={errors.show_interpretation_text}>
            <select value={String(value.show_interpretation_text)} onChange={handleBool('show_interpretation_text')} className={inputClass(Boolean(errors.show_interpretation_text))}>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </FieldWrapper>
          <FieldWrapper label="Show development recommendations" where="Generated development focus section." error={errors.show_recommendations}>
            <select value={String(value.show_recommendations)} onChange={handleBool('show_recommendations')} className={inputClass(Boolean(errors.show_recommendations))}>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </FieldWrapper>
          {value.report_template === 'default' ? (
            <FieldWrapper label="Score display mode" where="Controls competency card score labels. Raw mode hides the benchmark section entirely." error={errors.scoring_display_mode}>
              <select
                value={value.scoring_display_mode}
                onChange={(event) => setField(value, onChange, 'scoring_display_mode', event.target.value as 'percentile' | 'raw')}
                className={inputClass(Boolean(errors.scoring_display_mode))}
              >
                <option value="percentile">Percentile rank</option>
                <option value="raw">Raw score</option>
              </select>
            </FieldWrapper>
          ) : null}
        </ConfigSection>
      ) : null}

      {visible.has('next') ? (
        <ConfigSection title="Next step" description="Control the single follow-on action shown at the end of the report.">
          <FieldWrapper label="CTA label" where="Main call-to-action button in report." error={errors.next_steps_cta_label}>
            <input value={value.next_steps_cta_label} onChange={handleString('next_steps_cta_label')} className={inputClass(Boolean(errors.next_steps_cta_label))} />
          </FieldWrapper>
          <FieldWrapper label="CTA link" where="Navigation destination for next-step CTA." error={errors.next_steps_cta_href}>
            <input value={value.next_steps_cta_href} onChange={handleString('next_steps_cta_href')} className={inputClass(Boolean(errors.next_steps_cta_href))} />
          </FieldWrapper>
        </ConfigSection>
      ) : null}

      {visible.has('export') ? (
        <ConfigSection title="Export" description="Choose whether this report can be downloaded as a PDF.">
          <FieldWrapper label="PDF export" where="Download report actions." error={errors.pdf_enabled}>
            <select value={String(value.pdf_enabled)} onChange={handleBool('pdf_enabled')} className={inputClass(Boolean(errors.pdf_enabled))}>
              <option value="false">Disabled</option>
              <option value="true">Enabled</option>
            </select>
          </FieldWrapper>
          {value.pdf_enabled ? (
            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">PDF section visibility</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Uncheck sections you want to exclude from the PDF export.
                </p>
              </div>
              <div className="space-y-2">
                {VALID_PDF_HIDDEN_SECTION_IDS.map((sectionId) => {
                  const isIncluded = !value.pdf_hidden_sections.includes(sectionId)

                  return (
                    <label key={sectionId} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={isIncluded}
                        onChange={() => {
                          const next = isIncluded
                            ? [...value.pdf_hidden_sections, sectionId]
                            : value.pdf_hidden_sections.filter((id) => id !== sectionId)
                          setField(value, onChange, 'pdf_hidden_sections', next)
                        }}
                        className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600"
                      />
                      <span>{pdfSectionLabels[sectionId]}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          ) : null}
        </ConfigSection>
      ) : null}
    </div>
  )
}
