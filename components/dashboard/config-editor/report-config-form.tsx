import type { ChangeEvent, ReactNode } from 'react'
import type { ReportConfig } from '@/utils/assessments/experience-config'
import { ConfigSection } from '@/components/dashboard/config-editor/config-section'
import { FieldHint } from '@/components/dashboard/config-editor/field-hint'

export type ReportFieldKey = keyof ReportConfig

export const REPORT_SECTION_ITEMS = [
  { id: 'header', label: 'Header' },
  { id: 'sections', label: 'Sections' },
  { id: 'next', label: 'Next CTA' },
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
        <ConfigSection title="Visible sections" description="Control which report blocks are shown to users.">
          <FieldWrapper label="Show overall classification" where="Current profile summary block." error={errors.show_overall_classification}>
            <select value={String(value.show_overall_classification)} onChange={handleBool('show_overall_classification')} className={inputClass(Boolean(errors.show_overall_classification))}>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </FieldWrapper>
          <FieldWrapper label="Show dimension summaries" where="Descriptor cards for each readiness dimension." error={errors.show_dimension_scores}>
            <select value={String(value.show_dimension_scores)} onChange={handleBool('show_dimension_scores')} className={inputClass(Boolean(errors.show_dimension_scores))}>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </FieldWrapper>
          <FieldWrapper label="Show recommendations" where="Recommendations section." error={errors.show_recommendations}>
            <select value={String(value.show_recommendations)} onChange={handleBool('show_recommendations')} className={inputClass(Boolean(errors.show_recommendations))}>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </FieldWrapper>
        </ConfigSection>
      ) : null}

      {visible.has('next') ? (
        <ConfigSection title="Next steps" description="Primary next-step action shown on report pages.">
          <FieldWrapper label="CTA label" where="Main call-to-action button in report." error={errors.next_steps_cta_label}>
            <input value={value.next_steps_cta_label} onChange={handleString('next_steps_cta_label')} className={inputClass(Boolean(errors.next_steps_cta_label))} />
          </FieldWrapper>
          <FieldWrapper label="CTA link" where="Navigation destination for next-step CTA." error={errors.next_steps_cta_href}>
            <input value={value.next_steps_cta_href} onChange={handleString('next_steps_cta_href')} className={inputClass(Boolean(errors.next_steps_cta_href))} />
          </FieldWrapper>
        </ConfigSection>
      ) : null}

      {visible.has('export') ? (
        <ConfigSection title="Export" description="Report export options.">
          <FieldWrapper label="PDF export" where="Download report actions." error={errors.pdf_enabled}>
            <select value={String(value.pdf_enabled)} onChange={handleBool('pdf_enabled')} className={inputClass(Boolean(errors.pdf_enabled))}>
              <option value="false">Disabled</option>
              <option value="true">Enabled</option>
            </select>
          </FieldWrapper>
        </ConfigSection>
      ) : null}
    </div>
  )
}
