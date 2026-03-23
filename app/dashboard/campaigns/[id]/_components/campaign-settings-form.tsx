'use client'

import { useMemo, useState, type ReactNode, type RefObject } from 'react'
import { AutoSaveStatus } from '@/components/dashboard/ui/auto-save-status'
import type { AutoSaveStatus as AutoSaveStatusType } from '@/components/dashboard/hooks/use-auto-save'
import { ColorField } from '@/components/dashboard/ui/color-field'
import { CampaignBrandingSpecimen } from '@/components/site/campaign-branding-specimen'
import { DemographicsFieldSelector } from '@/components/dashboard/campaigns/demographics-field-selector'
import type {
  CampaignBrandingMode,
  CampaignConfig,
  DemographicsPosition,
  DemographicFieldKey,
  LqBrandingVariant,
  RegistrationPosition,
  ReportAccess,
} from '@/utils/assessments/campaign-types'
import type { Organisation } from '../_lib/campaign-overview'

type ReportOption = {
  id: string
  name: string
  assessmentName: string
}

type SettingsTab = 'brand' | 'audience' | 'general'

const SETTINGS_TABS: Array<{ key: SettingsTab; label: string }> = [
  { key: 'brand', label: 'Brand' },
  { key: 'audience', label: 'Audience' },
  { key: 'general', label: 'General' },
]

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-[clamp(1.55rem,3vw,2.2rem)] leading-[1.04] text-[var(--admin-text-primary)]">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--admin-text-muted)]">{description}</p>
    </div>
  )
}

function Field({
  label,
  helper,
  children,
}: {
  label: string
  helper?: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[var(--admin-text-primary)]">{label}</span>
      {children}
      {helper ? <p className="text-xs text-[var(--admin-text-muted)]">{helper}</p> : null}
    </label>
  )
}

export function CampaignSettingsForm({
  name,
  externalName,
  description,
  slug,
  orgId,
  organisations,
  registrationPosition,
  reportAccess,
  reportOptions,
  selectedReportId,
  demographicsEnabled,
  demographicsPosition,
  demographicsFields,
  entryLimit,
  brandingMode,
  brandingLqVariant,
  brandingSourceOrganisationId,
  brandingLogoUrl,
  brandingLogoPreview,
  brandingCompanyName,
  brandingShowAttribution,
  previewCampaignConfig,
  previewOrganisationName,
  previewOrganisationBrandingConfig,
  brandingFileInputRef,
  autoSaveStatus,
  autoSaveError,
  autoSaveSavedAt,
  onRetrySave,
  onNameChange,
  onExternalNameChange,
  onDescriptionChange,
  onOrgIdChange,
  onRegistrationPositionChange,
  onReportAccessChange,
  onReportChange,
  onDemographicsEnabledChange,
  onDemographicsPositionChange,
  onEntryLimitChange,
  onToggleDemographicsField,
  onBrandingModeChange,
  onBrandingLqVariantChange,
  onBrandingSourceOrganisationIdChange,
  onBrandingLogoUrlChange,
  onBrandingCompanyNameChange,
  brandingPrimaryColor,
  brandingSecondaryColor,
  brandingSurfaceTintColor,
  onBrandingPrimaryColorChange,
  onBrandingSecondaryColorChange,
  onBrandingSurfaceTintColorChange,
  onBrandingShowAttributionChange,
  onBrandingFileChange,
  onBrandingRemoveLogo,
}: {
  name: string
  externalName: string
  description: string
  slug: string
  orgId: string
  organisations: Organisation[]
  registrationPosition: RegistrationPosition
  reportAccess: ReportAccess
  reportOptions: ReportOption[]
  selectedReportId: string
  demographicsEnabled: boolean
  demographicsPosition: DemographicsPosition
  demographicsFields: DemographicFieldKey[]
  entryLimit: string
  brandingMode: CampaignBrandingMode
  brandingLqVariant: LqBrandingVariant | null
  brandingSourceOrganisationId: string
  brandingLogoUrl: string
  brandingLogoPreview: string | null
  brandingCompanyName: string
  brandingShowAttribution: boolean
  previewCampaignConfig: CampaignConfig
  previewOrganisationName: string | null
  previewOrganisationBrandingConfig: unknown
  brandingFileInputRef: RefObject<HTMLInputElement | null>
  autoSaveStatus: AutoSaveStatusType
  autoSaveError: string | null
  autoSaveSavedAt: string | null
  onRetrySave: () => void
  onNameChange: (value: string) => void
  onExternalNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onOrgIdChange: (value: string) => void
  onRegistrationPositionChange: (value: RegistrationPosition) => void
  onReportAccessChange: (value: ReportAccess) => void
  onReportChange: (value: string) => void
  onDemographicsEnabledChange: (value: boolean) => void
  onDemographicsPositionChange: (value: DemographicsPosition) => void
  onEntryLimitChange: (value: string) => void
  onToggleDemographicsField: (field: string) => void
  onBrandingModeChange: (value: CampaignBrandingMode) => void
  onBrandingLqVariantChange: (value: LqBrandingVariant) => void
  onBrandingSourceOrganisationIdChange: (value: string) => void
  onBrandingLogoUrlChange: (value: string) => void
  onBrandingCompanyNameChange: (value: string) => void
  onBrandingShowAttributionChange: (value: boolean) => void
  brandingPrimaryColor: string
  brandingSecondaryColor: string
  brandingSurfaceTintColor: string
  onBrandingPrimaryColorChange: (value: string) => void
  onBrandingSecondaryColorChange: (value: string) => void
  onBrandingSurfaceTintColorChange: (value: string) => void
  onBrandingFileChange: (file: File | null) => void
  onBrandingRemoveLogo: () => void
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('brand')
  const [brandSearch, setBrandSearch] = useState('')

  const filteredOrganisations = useMemo(() => {
    const query = brandSearch.trim().toLowerCase()
    if (!query) return organisations
    return organisations.filter((organisation) => {
      const haystack = [organisation.name, organisation.slug].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [brandSearch, organisations])

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-[rgba(103,127,159,0.14)] bg-white px-6 py-6 shadow-[0_28px_80px_rgba(15,23,42,0.06)] md:px-7 md:py-7">
        <SectionIntro
          eyebrow="Campaign workspace"
          title="Choose how this campaign inherits brand and audience rules"
          description="Brand selection lives here, but full brand authoring now belongs on the client record. Campaign settings should stay focused on application, overrides, and participant access rules."
        />

        <div className="admin-toggle-group mt-5 overflow-x-auto" role="tablist" aria-label="Campaign settings sections">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={activeTab === tab.key ? 'admin-toggle-chip admin-toggle-chip-active' : 'admin-toggle-chip'}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'brand' ? (
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-[rgba(103,127,159,0.14)] bg-white px-6 py-6 shadow-[0_24px_72px_rgba(15,23,42,0.05)] md:px-7">
            <SectionIntro
              eyebrow="Brand application"
              title="Apply a shared client brand to this campaign"
              description="Use Leadership Quarter, hide the header entirely, or apply a client brand. Full palette control belongs to the client brand studio so campaigns stay clean and consistent."
            />

            <div className="mt-6 space-y-5">
              <Field label="Header mode" helper="`Branded client theme` uses the selected client brand plus any local logo/name overrides below.">
                <select
                  value={brandingMode}
                  onChange={(event) => onBrandingModeChange(event.target.value as CampaignBrandingMode)}
                  className="foundation-field w-full"
                >
                  <option value="lq">Leadership Quarter</option>
                  <option value="custom">Branded client theme</option>
                  <option value="none">Hidden header</option>
                </select>
              </Field>

              {brandingMode === 'lq' ? (
                <div>
                  <span className="text-sm font-medium text-[var(--admin-text-primary)]">LQ theme variant</span>
                  <div className="admin-toggle-group mt-1.5" role="radiogroup" aria-label="LQ theme variant">
                    {(['light', 'dark'] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={(brandingLqVariant ?? 'light') === v}
                        onClick={() => onBrandingLqVariantChange(v)}
                        className={(brandingLqVariant ?? 'light') === v ? 'admin-toggle-chip admin-toggle-chip-active' : 'admin-toggle-chip'}
                      >
                        {v === 'light' ? 'Light (default)' : 'Dark'}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {brandingMode === 'custom' ? (
                <>
                  <div className="rounded-[1.6rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(247,249,252,0.82)] p-5">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                      <Field label="Search client brands" helper="Filter the client list by name or slug.">
                        <input
                          value={brandSearch}
                          onChange={(event) => setBrandSearch(event.target.value)}
                          className="foundation-field w-full"
                          placeholder="Search clients..."
                        />
                      </Field>

                      <Field label="Brand source" helper="The selected client provides the palette, surface treatment, and default participant logo/name.">
                        <select
                          value={brandingSourceOrganisationId}
                          onChange={(event) => onBrandingSourceOrganisationIdChange(event.target.value)}
                          className="foundation-field w-full"
                        >
                          <option value="">Use the linked campaign client when available</option>
                          {filteredOrganisations.map((organisation) => (
                            <option key={organisation.id} value={organisation.id}>
                              {organisation.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </div>

                  <div className="rounded-[1.6rem] border border-[rgba(103,127,159,0.14)] bg-white p-5 shadow-[0_16px_44px_rgba(15,23,42,0.04)]">
                    <div className="space-y-5">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-text-soft)]">Small campaign overrides</p>
                        <h3 className="mt-2 text-lg font-semibold text-[var(--admin-text-primary)]">Use only where this campaign genuinely needs a local presentation difference</h3>
                      </div>

                      <Field label="Display name override" helper="Optional. Leave blank to use the selected client brand name.">
                        <input
                          type="text"
                          value={brandingCompanyName}
                          onChange={(event) => onBrandingCompanyNameChange(event.target.value)}
                          className="foundation-field w-full"
                          placeholder="Defaults to selected client brand"
                        />
                      </Field>

                      <div className="rounded-[1.4rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(247,249,252,0.82)] p-4">
                        <div className="flex flex-wrap items-center gap-4">
                          {brandingLogoPreview ? (
                            <div className="flex h-16 w-40 items-center justify-center rounded-xl border border-[rgba(103,127,159,0.14)] bg-white p-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={brandingLogoPreview} alt="Campaign logo preview" className="max-h-full max-w-full object-contain" />
                            </div>
                          ) : (
                            <div className="flex h-16 w-40 items-center justify-center rounded-xl border border-dashed border-[rgba(103,127,159,0.16)] bg-white text-xs text-[var(--admin-text-muted)]">
                              Inherit logo from selected brand
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => brandingFileInputRef.current?.click()}
                              className="foundation-btn foundation-btn-secondary px-4 py-2 text-sm"
                            >
                              {brandingLogoPreview ? 'Replace logo' : 'Upload logo override'}
                            </button>
                            {brandingLogoPreview ? (
                              <button
                                type="button"
                                onClick={onBrandingRemoveLogo}
                                className="foundation-btn foundation-btn-secondary px-4 py-2 text-sm"
                              >
                                Remove override
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <input
                          ref={brandingFileInputRef}
                          type="file"
                          accept="image/png,image/svg+xml,image/webp,image/jpeg"
                          className="hidden"
                          onChange={(event) => onBrandingFileChange(event.target.files?.[0] ?? null)}
                        />
                        <Field label="Logo override URL" helper="Optional. Leave blank to inherit the selected client brand logo.">
                          <input
                            type="url"
                            value={brandingLogoUrl}
                            onChange={(event) => onBrandingLogoUrlChange(event.target.value)}
                            className="foundation-field mt-4 w-full"
                            placeholder="https://..."
                          />
                        </Field>
                      </div>

                      <label className="flex items-start gap-3 rounded-[1.4rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(247,249,252,0.82)] p-4 text-sm text-[var(--admin-text-primary)]">
                        <input
                          type="checkbox"
                          checked={brandingShowAttribution}
                          onChange={(event) => onBrandingShowAttributionChange(event.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-[rgba(103,127,159,0.24)]"
                        />
                        <span>
                          Show Leadership Quarter attribution for this campaign
                          <span className="mt-1 block text-xs text-[var(--admin-text-muted)]">
                            Use this if the campaign should override the selected client brand’s default attribution behavior.
                          </span>
                        </span>
                      </label>

                      <div className="rounded-[1.4rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(247,249,252,0.72)] p-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-text-soft)]">Colour overrides</p>
                          <h4 className="mt-2 text-base font-semibold text-[var(--admin-text-primary)]">Override specific brand colours for this campaign only</h4>
                          <p className="mt-1 text-xs text-[var(--admin-text-muted)]">Leave blank to inherit from the selected client brand.</p>
                        </div>
                        <div className="mt-4 grid gap-4 lg:grid-cols-3">
                          <ColorField
                            label="Primary CTA override"
                            value={brandingPrimaryColor}
                            onChange={onBrandingPrimaryColorChange}
                            placeholder="#2f5f99"
                            helper="Overrides the main call to action colour for this campaign."
                            fallback="#2f5f99"
                            invalid={Boolean(brandingPrimaryColor.trim()) && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(brandingPrimaryColor.trim())}
                          />
                          <ColorField
                            label="Secondary accent override"
                            value={brandingSecondaryColor}
                            onChange={onBrandingSecondaryColorChange}
                            placeholder="#7ca8d6"
                            helper="Overrides the secondary accent colour for this campaign."
                            fallback="#7ca8d6"
                            invalid={Boolean(brandingSecondaryColor.trim()) && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(brandingSecondaryColor.trim())}
                          />
                          <ColorField
                            label="Surface tint override"
                            value={brandingSurfaceTintColor}
                            onChange={onBrandingSurfaceTintColorChange}
                            placeholder="#f5f6f9"
                            helper="Overrides the canvas tint colour for this campaign."
                            fallback="#f5f6f9"
                            invalid={Boolean(brandingSurfaceTintColor.trim()) && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(brandingSurfaceTintColor.trim())}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <CampaignBrandingSpecimen
            campaignConfig={previewCampaignConfig}
            organisationName={previewOrganisationName}
            organisationBrandingConfig={previewOrganisationBrandingConfig}
            description="This uses the same participant shell and theme resolution as Journey preview and the live campaign experience. Use it to confirm the selected client brand, local overrides, and header mode are all correct."
          />
        </div>
      ) : null}

      {activeTab === 'audience' ? (
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-[rgba(103,127,159,0.14)] bg-white px-6 py-6 shadow-[0_24px_72px_rgba(15,23,42,0.05)] md:px-7">
            <SectionIntro
              eyebrow="Audience rules"
              title="Control how people enter the campaign and what participant detail is collected"
              description="Keep entry, report access, and demographics together so this page reads like one participant policy workspace instead of separate feature toggles."
            />

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="Registration position">
                <select
                  value={registrationPosition}
                  onChange={(event) => onRegistrationPositionChange(event.target.value as RegistrationPosition)}
                  className="foundation-field w-full"
                >
                  <option value="before">Before assessment</option>
                  <option value="after">After assessment</option>
                  <option value="none">None (anonymous)</option>
                </select>
              </Field>

              <Field label="Report access">
                <select
                  value={reportAccess}
                  onChange={(event) => onReportAccessChange(event.target.value as ReportAccess)}
                  className="foundation-field w-full"
                >
                  <option value="immediate">Immediate</option>
                  <option value="gated">Gated</option>
                  <option value="none">None</option>
                </select>
              </Field>

              {reportAccess !== 'none' ? (
                reportOptions.length > 0 ? (
                  <Field label="Report" helper="Select the audience report participants receive. Reports are created in the assessment's Report Library.">
                    <select
                      value={selectedReportId}
                      onChange={(event) => onReportChange(event.target.value)}
                      className="foundation-field w-full"
                    >
                      <option value="">Default</option>
                      {reportOptions.map((report) => (
                        <option key={report.id} value={report.id}>
                          {report.name} — {report.assessmentName}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <p className="text-xs text-[var(--admin-text-muted)] md:col-span-2">
                    No published audience reports found. Create reports in the assessment&apos;s Report Library tab.
                  </p>
                )
              ) : null}

              {registrationPosition === 'after' && reportAccess === 'gated' ? (
                <div className="rounded-[1.4rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(237,242,250,0.6)] p-4 md:col-span-2">
                  <p className="text-sm font-semibold text-[var(--admin-text-primary)]">Lead-gen gated flow</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--admin-text-muted)]">
                    Participants complete the assessment anonymously, then register to unlock their report.
                    Registration will capture them as both a participant and a CRM contact.
                    All identity fields and consent are required. Customise consent copy in the Journey editor.
                  </p>
                </div>
              ) : null}

              <Field label="Assessment limit" helper="Leave blank to keep the campaign open without a cap.">
                <input
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={entryLimit}
                  onChange={(event) => onEntryLimitChange(event.target.value)}
                  placeholder="Leave blank for unlimited"
                  className="foundation-field w-full"
                />
              </Field>

              <label className="flex items-start gap-3 rounded-[1.4rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(247,249,252,0.82)] p-4 text-sm text-[var(--admin-text-primary)] md:mt-7">
                <input
                  type="checkbox"
                  checked={demographicsEnabled}
                  onChange={(event) => onDemographicsEnabledChange(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[rgba(103,127,159,0.24)]"
                />
                <span>
                  Collect demographics in this campaign
                  <span className="mt-1 block text-xs text-[var(--admin-text-muted)]">
                    Journey controls where the demographics page appears. This tab controls whether it exists and which fields it collects.
                  </span>
                </span>
              </label>
            </div>
          </div>

          {demographicsEnabled ? (
            <div className="rounded-[2rem] border border-[rgba(103,127,159,0.14)] bg-white px-6 py-6 shadow-[0_24px_72px_rgba(15,23,42,0.05)] md:px-7">
              <div className="space-y-5">
                <Field label="Demographics position" helper="Journey still owns the full page order. This defines the preferred placement rule for the demographics step.">
                  <select
                    value={demographicsPosition}
                    onChange={(event) => onDemographicsPositionChange(event.target.value as DemographicsPosition)}
                    className="foundation-field w-full"
                  >
                    <option value="before">Before assessment</option>
                    <option value="after">After assessment</option>
                  </select>
                </Field>

                <DemographicsFieldSelector
                  selectedFields={demographicsFields}
                  onToggleField={onToggleDemographicsField}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'general' ? (
        <div className="rounded-[2rem] border border-[rgba(103,127,159,0.14)] bg-white px-6 py-6 shadow-[0_24px_72px_rgba(15,23,42,0.05)] md:px-7">
          <SectionIntro
            eyebrow="General"
            title="Campaign identity and ownership"
            description="Keep internal naming, public naming, and owning client together so this section stays operational rather than decorative."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Internal name" helper="Shown in admin only.">
              <input
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                className="foundation-field w-full"
              />
            </Field>

            <Field label="External name" helper="Used on campaign pages, reports, and participant-facing flows.">
              <input
                value={externalName}
                onChange={(event) => onExternalNameChange(event.target.value)}
                className="foundation-field w-full"
              />
            </Field>

            <Field label="Description" helper="Shown as report subtitle and participant-facing supporting context when needed.">
              <textarea
                value={description}
                onChange={(event) => onDescriptionChange(event.target.value)}
                rows={3}
                className="foundation-field min-h-[120px] w-full rounded-[1.25rem]"
              />
            </Field>

            <div className="space-y-5">
              <Field label="Slug" helper="Derived from the external name and updated automatically.">
                <input
                  value={slug}
                  readOnly
                  className="foundation-field w-full bg-[rgba(247,248,252,0.9)] font-mono"
                />
              </Field>

              <Field label="Linked client" helper="The linked client controls campaign ownership and is the default brand source if no explicit brand source is selected.">
                <select
                  value={orgId}
                  onChange={(event) => onOrgIdChange(event.target.value)}
                  className="foundation-field w-full"
                >
                  <option value="">None (public)</option>
                  {organisations.map((organisation) => (
                    <option key={organisation.id} value={organisation.id}>
                      {organisation.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-[2rem] border border-[rgba(103,127,159,0.14)] bg-white px-6 py-5 shadow-[0_22px_60px_rgba(15,23,42,0.05)] md:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--admin-text-muted)]">
            Changes are saved automatically.
          </p>
          <AutoSaveStatus status={autoSaveStatus} error={autoSaveError} savedAt={autoSaveSavedAt} onRetry={onRetrySave} />
        </div>
      </div>
    </div>
  )
}
