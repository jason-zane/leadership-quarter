import {
  type DemographicsPosition,
  type DemographicFieldKey,
  type RegistrationPosition,
  type ReportAccess,
} from '@/utils/assessments/campaign-types'
import { DemographicsFieldSelector } from '@/components/dashboard/campaigns/demographics-field-selector'
import type { Organisation } from '../_lib/campaign-overview'

export function CampaignSettingsForm({
  name,
  externalName,
  description,
  slug,
  orgId,
  organisations,
  registrationPosition,
  reportAccess,
  demographicsEnabled,
  demographicsPosition,
  demographicsFields,
  entryLimit,
  configSaving,
  configDirty,
  configError,
  configSavedAt,
  onNameChange,
  onExternalNameChange,
  onDescriptionChange,
  onOrgIdChange,
  onRegistrationPositionChange,
  onReportAccessChange,
  onDemographicsEnabledChange,
  onDemographicsPositionChange,
  onEntryLimitChange,
  onToggleDemographicsField,
  onSave,
}: {
  name: string
  externalName: string
  description: string
  slug: string
  orgId: string
  organisations: Organisation[]
  registrationPosition: RegistrationPosition
  reportAccess: ReportAccess
  demographicsEnabled: boolean
  demographicsPosition: DemographicsPosition
  demographicsFields: DemographicFieldKey[]
  entryLimit: string
  configSaving: boolean
  configDirty: boolean
  configError: string | null
  configSavedAt: string | null
  onNameChange: (value: string) => void
  onExternalNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onOrgIdChange: (value: string) => void
  onRegistrationPositionChange: (value: RegistrationPosition) => void
  onReportAccessChange: (value: ReportAccess) => void
  onDemographicsEnabledChange: (value: boolean) => void
  onDemographicsPositionChange: (value: DemographicsPosition) => void
  onEntryLimitChange: (value: string) => void
  onToggleDemographicsField: (field: string) => void
  onSave: () => Promise<void>
}) {
  return (
    <div className="rounded-[1.75rem] border border-[rgba(103,127,159,0.14)] bg-white/78 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-[var(--admin-text-soft)]">Campaign basics</p>
      <p className="mb-4 text-sm text-[var(--admin-text-muted)]">Update the live campaign identity and owner context without opening the advanced controls.</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Internal name</span>
          <input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            className="w-full rounded-full border border-[rgba(103,127,159,0.2)] bg-white px-4 py-2.5 text-sm"
          />
          <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">Shown in admin only.</span>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">External name</span>
          <input
            value={externalName}
            onChange={(event) => onExternalNameChange(event.target.value)}
            className="w-full rounded-full border border-[rgba(103,127,159,0.2)] bg-white px-4 py-2.5 text-sm"
          />
          <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">Used on campaign pages, reports, and participant-facing flows.</span>
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Description</span>
          <textarea
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            rows={2}
            className="w-full rounded-[1.25rem] border border-[rgba(103,127,159,0.2)] bg-white px-4 py-3 text-sm"
          />
          <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">Shown as report subtitle; falls back to assessment description then report config subtitle.</span>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Slug</span>
          <input
            value={slug}
            readOnly
            className="w-full rounded-full border border-[rgba(103,127,159,0.2)] bg-[rgba(247,248,252,0.9)] px-4 py-2.5 font-mono text-sm"
          />
          <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">Derived from the external name and updates automatically.</span>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Organisation</span>
          <select
            value={orgId}
            onChange={(event) => onOrgIdChange(event.target.value)}
            className="w-full rounded-full border border-[rgba(103,127,159,0.2)] bg-white px-4 py-2.5 text-sm"
          >
            <option value="">None (public)</option>
            {organisations.map((organisation) => (
              <option key={organisation.id} value={organisation.id}>
                {organisation.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Registration position</span>
          <select
            value={registrationPosition}
            onChange={(event) => onRegistrationPositionChange(event.target.value as RegistrationPosition)}
            className="w-full rounded-full border border-[rgba(103,127,159,0.2)] bg-white px-4 py-2.5 text-sm"
          >
            <option value="before">Before assessment</option>
            <option value="after">After assessment</option>
            <option value="none">None (anonymous)</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Report access</span>
          <select
            value={reportAccess}
            onChange={(event) => onReportAccessChange(event.target.value as ReportAccess)}
            className="w-full rounded-full border border-[rgba(103,127,159,0.2)] bg-white px-4 py-2.5 text-sm"
          >
            <option value="immediate">Immediate</option>
            <option value="gated">Gated</option>
            <option value="none">None</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Assessment limit</span>
          <input
            type="number"
            min="1"
            inputMode="numeric"
            value={entryLimit}
            onChange={(event) => onEntryLimitChange(event.target.value)}
            placeholder="Leave blank for unlimited"
            className="w-full rounded-full border border-[rgba(103,127,159,0.2)] bg-white px-4 py-2.5 text-sm"
          />
          <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">Leave blank to keep the campaign open without a cap.</span>
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm text-zinc-700 dark:text-zinc-200">
          <input
            type="checkbox"
            checked={demographicsEnabled}
            onChange={(event) => onDemographicsEnabledChange(event.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
          />
          Collect demographics
        </label>
      </div>

      {demographicsEnabled ? (
        <div className="mt-4">
          <div className="mb-4">
            <label className="space-y-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Demographics position</span>
              <select
                value={demographicsPosition}
                onChange={(event) => onDemographicsPositionChange(event.target.value as DemographicsPosition)}
                className="mt-1 w-full rounded-full border border-[rgba(103,127,159,0.2)] bg-white px-4 py-2.5 text-sm"
              >
                <option value="before">Before assessment</option>
                <option value="after">After assessment</option>
              </select>
            </label>
          </div>
          <DemographicsFieldSelector
            selectedFields={demographicsFields}
            onToggleField={onToggleDemographicsField}
          />
        </div>
      ) : null}

      {configError ? <p className="mt-3 text-sm text-red-600">{configError}</p> : null}
      {configDirty ? <p className="mt-3 text-xs font-medium text-amber-700">Unsaved changes</p> : null}
      {!configDirty && configSavedAt ? <p className="mt-3 text-xs text-emerald-600">Saved at {configSavedAt}</p> : null}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => {
            void onSave()
          }}
          disabled={configSaving}
          className="rounded-full bg-[var(--admin-accent)] px-4 py-2.5 text-sm font-medium text-white shadow-[0_10px_24px_rgba(82,110,255,0.24)] disabled:opacity-60"
        >
          {configSaving ? 'Saving...' : 'Save campaign settings'}
        </button>
      </div>
    </div>
  )
}
