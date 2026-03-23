'use client'

import { type ReactNode } from 'react'
import { AutoSaveStatus } from '@/components/dashboard/ui/auto-save-status'
import type { AutoSaveStatus as AutoSaveStatusType } from '@/components/dashboard/hooks/use-auto-save'
import { DemographicsFieldSelector } from '@/components/dashboard/campaigns/demographics-field-selector'
import type {
  DemographicsPosition,
  DemographicFieldKey,
  RegistrationPosition,
  ReportAccess,
} from '@/utils/assessments/campaign-types'
import type { Organisation } from '../_lib/campaign-overview'

type ReportOption = {
  id: string
  name: string
  assessmentName: string
}

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
  invitationDemographicsEnabled,
  entryLimit,
  autoSaveStatus,
  autoSaveError,
  autoSaveSavedAt,
  onSaveNow,
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
  onInvitationDemographicsEnabledChange,
  onEntryLimitChange,
  onToggleDemographicsField,
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
  invitationDemographicsEnabled: boolean
  entryLimit: string
  autoSaveStatus: AutoSaveStatusType
  autoSaveError: string | null
  autoSaveSavedAt: string | null
  onSaveNow: () => void
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
  onInvitationDemographicsEnabledChange: (value: boolean) => void
  onEntryLimitChange: (value: string) => void
  onToggleDemographicsField: (field: string) => void
}) {
  return (
    <div className="space-y-6">
      {/* Section 1 — Campaign identity */}
      <div className="rounded-[2rem] border border-[rgba(103,127,159,0.14)] bg-white px-6 py-6 shadow-[0_24px_72px_rgba(15,23,42,0.05)] md:px-7">
        <SectionIntro
          eyebrow="Campaign identity"
          title="Naming and ownership"
          description="Internal naming, public naming, and owning client."
        />

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="Internal name" helper="Shown in admin only.">
            <input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onBlur={onSaveNow}
              className="foundation-field w-full"
            />
          </Field>

          <Field label="External name" helper="Used on campaign pages, reports, and participant-facing flows.">
            <input
              value={externalName}
              onChange={(e) => onExternalNameChange(e.target.value)}
              onBlur={onSaveNow}
              className="foundation-field w-full"
            />
          </Field>

          <Field label="Description" helper="Shown as report subtitle and participant-facing supporting context when needed.">
            <textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              onBlur={onSaveNow}
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
                onChange={(e) => onOrgIdChange(e.target.value)}
                className="foundation-field w-full"
              >
                <option value="">None (public)</option>
                {organisations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </div>

      {/* Section 2 — Audience and access */}
      <div className="rounded-[2rem] border border-[rgba(103,127,159,0.14)] bg-white px-6 py-6 shadow-[0_24px_72px_rgba(15,23,42,0.05)] md:px-7">
        <SectionIntro
          eyebrow="Audience and access"
          title="Control how people enter and what detail is collected"
          description="Entry, report access, and demographics together as one participant policy."
        />

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="Registration position">
            <select
              value={registrationPosition}
              onChange={(e) => onRegistrationPositionChange(e.target.value as RegistrationPosition)}
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
              onChange={(e) => onReportAccessChange(e.target.value as ReportAccess)}
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
                  onChange={(e) => onReportChange(e.target.value)}
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

          <Field label="Campaign entry limit" helper="Per-campaign cap on total entries regardless of client. Leave blank for no limit. Per-client assessment quotas are set in the client's Assessments tab.">
            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={entryLimit}
              onChange={(e) => onEntryLimitChange(e.target.value)}
              onBlur={onSaveNow}
              placeholder="Leave blank for unlimited"
              className="foundation-field w-full"
            />
          </Field>

          <label className="flex items-start gap-3 rounded-[1.4rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(247,249,252,0.82)] p-4 text-sm text-[var(--admin-text-primary)] md:mt-7">
            <input
              type="checkbox"
              checked={demographicsEnabled}
              onChange={(e) => onDemographicsEnabledChange(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[rgba(103,127,159,0.24)]"
            />
            <span>
              Collect demographics in this campaign
              <span className="mt-1 block text-xs text-[var(--admin-text-muted)]">
                Journey controls where the demographics page appears. This tab controls whether it exists and which fields it collects.
              </span>
            </span>
          </label>

          {demographicsEnabled ? (
            <label className="flex items-start gap-3 rounded-[1.4rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(247,249,252,0.82)] p-4 text-sm text-[var(--admin-text-primary)]">
              <input
                type="checkbox"
                checked={invitationDemographicsEnabled}
                onChange={(e) => onInvitationDemographicsEnabledChange(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-[rgba(103,127,159,0.24)]"
              />
              <span>
                Also collect demographics from email-invited participants
                <span className="mt-1 block text-xs text-[var(--admin-text-muted)]">
                  When off, participants who arrive via an email invitation link skip the demographics step. Demographics are always placed after the assessment for invited participants.
                </span>
              </span>
            </label>
          ) : null}
        </div>
      </div>

      {demographicsEnabled ? (
        <div className="rounded-[2rem] border border-[rgba(103,127,159,0.14)] bg-white px-6 py-6 shadow-[0_24px_72px_rgba(15,23,42,0.05)] md:px-7">
          <div className="space-y-5">
            <Field label="Demographics position" helper="Journey still owns the full page order. This defines the preferred placement rule for the demographics step.">
              <select
                value={demographicsPosition}
                onChange={(e) => onDemographicsPositionChange(e.target.value as DemographicsPosition)}
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
