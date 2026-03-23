'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAutoSave } from '@/components/dashboard/hooks/use-auto-save'
import { AutoSaveStatus } from '@/components/dashboard/ui/auto-save-status'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import type { SettingCategory, SettingRow } from '@/utils/services/platform-settings'

const CATEGORY_META: Record<SettingCategory, { label: string; description: string }> = {
  rate_limits: {
    label: 'Rate Limits',
    description: 'Protect public, admin, and portal traffic with sensible request ceilings.',
  },
  email: {
    label: 'Email',
    description: 'Control delivery pacing so campaign operations do not damage sender reputation.',
  },
  tokens: {
    label: 'Tokens',
    description: 'Set operational lifetimes for report links, invitations, gate tokens, and bypass sessions.',
  },
  campaigns: {
    label: 'Campaign Defaults',
    description: 'Tune default list sizes and baseline campaign workspace behavior.',
  },
}

const CATEGORY_ORDER: SettingCategory[] = ['rate_limits', 'email', 'tokens', 'campaigns']

type DraftValues = Record<string, number | string | boolean>

function settingKey(s: { category: string; key: string }) {
  return `${s.category}:${s.key}`
}

function isInvalid(s: SettingRow, value: number | string | boolean) {
  if (s.type !== 'number') return false
  const num = Number(value)
  return Number.isNaN(num) || (s.min !== undefined && num < s.min) || (s.max !== undefined && num > s.max)
}

function countInvalid(settings: SettingRow[], draft: DraftValues) {
  return settings.filter((s) => isInvalid(s, draft[settingKey(s)] ?? s.currentValue)).length
}

export function PlatformSettingsEditor() {
  const [settings, setSettings] = useState<SettingRow[]>([])
  const [draft, setDraft] = useState<DraftValues>({})
  const [activeCategory, setActiveCategory] = useState<SettingCategory>('rate_limits')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const validate = useCallback((data: DraftValues) => {
    const count = countInvalid(settings, data)
    return count > 0 ? `${count} invalid setting${count > 1 ? 's' : ''}` : null
  }, [settings])

  const onSave = useCallback(async (data: DraftValues) => {
    const updates = settings
      .filter((s) => data[settingKey(s)] !== undefined)
      .map((s) => ({
        category: s.category,
        key: s.key,
        value: data[settingKey(s)],
      }))

    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: updates }),
    })

    const body = (await res?.json().catch(() => null)) as {
      ok?: boolean
      error?: string
      settings?: SettingRow[]
    } | null

    if (!res.ok || !body?.ok || !body.settings) {
      throw new Error(body?.error ?? 'Failed to save settings.')
    }

    setSettings(body.settings)
    const values: DraftValues = {}
    for (const s of body.settings) values[settingKey(s)] = s.currentValue
    setDraft(values)
  }, [settings])

  const { status, error, savedAt, saveNow, markSaved } = useAutoSave({
    data: draft,
    onSave,
    validate,
    saveOn: 'blur',
  })

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const res = await fetch('/api/admin/settings', { cache: 'no-store' }).catch(() => null)
    const body = (await res?.json().catch(() => null)) as { ok?: boolean; settings?: SettingRow[] } | null

    if (!res?.ok || !body?.ok || !body.settings) {
      setLoadError('Could not load platform settings.')
      setLoading(false)
      return
    }

    setSettings(body.settings)
    const values: DraftValues = {}
    for (const s of body.settings) values[settingKey(s)] = s.currentValue
    setDraft(values)
    markSaved(values)
    setLoading(false)
  }, [markSaved])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const activeSettings = useMemo(
    () => settings.filter((s) => s.category === activeCategory),
    [activeCategory, settings]
  )

  const modifiedCount = settings.filter((s) => {
    const draftValue = draft[settingKey(s)]
    return draftValue !== undefined && draftValue !== s.currentValue
  }).length

  const overrideCount = settings.filter((s) => {
    const currentValue = draft[settingKey(s)] ?? s.currentValue
    return currentValue !== s.defaultValue
  }).length

  const invalidCount = countInvalid(settings, draft)

  function updateDraft(s: SettingRow, rawValue: string | boolean) {
    const value = s.type === 'number' ? Number(rawValue) : rawValue
    setDraft((prev) => ({ ...prev, [settingKey(s)]: value }))
  }

  function resetToDefault(s: SettingRow) {
    setDraft((prev) => ({ ...prev, [settingKey(s)]: s.defaultValue }))
  }

  if (loading) {
    return <p className="text-sm text-[var(--admin-text-muted)]">Loading platform settings...</p>
  }

  return (
    <div className="space-y-4">
      <FoundationSurface className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Platform controls</h2>
            <p className="mt-1 max-w-3xl text-sm text-[var(--admin-text-muted)]">
              Runtime controls for abuse protection, operational pacing, token expiry, and baseline campaign behavior.
            </p>
          </div>
          <AutoSaveStatus status={status} error={error} savedAt={savedAt} onRetry={() => void saveNow()} />
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Controls" value={settings.length} />
          <MetricCard label="Overrides" value={overrideCount} />
          <MetricCard label="Draft edits" value={modifiedCount} />
          <MetricCard label="Warnings" value={invalidCount} tone={invalidCount > 0 ? 'warning' : 'default'} />
        </div>
      </FoundationSurface>

      <FoundationSurface className="space-y-4 p-4">
        <div className="admin-toggle-group overflow-x-auto" role="tablist" aria-label="Platform setting categories">
          {CATEGORY_ORDER.map((category) => (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={activeCategory === category}
              onClick={() => setActiveCategory(category)}
              className={activeCategory === category ? 'admin-toggle-chip admin-toggle-chip-active' : 'admin-toggle-chip'}
            >
              {CATEGORY_META[category].label}
            </button>
          ))}
        </div>
        <p className="text-sm text-[var(--admin-text-muted)]">{CATEGORY_META[activeCategory].description}</p>
      </FoundationSurface>

      <div className="space-y-3">
        {activeSettings.map((s) => {
          const sk = settingKey(s)
          const currentDraft = draft[sk] ?? s.currentValue
          const invalid = isInvalid(s, currentDraft)
          const isOverride = currentDraft !== s.defaultValue
          const isChanged = currentDraft !== s.currentValue
          const showWarning = s.warning && s.type === 'number' && Number(currentDraft) > Number(s.defaultValue)

          return (
            <FoundationSurface key={sk} className="p-5">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px] xl:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">{s.label}</h3>
                    {isOverride ? (
                      <span className="rounded-full bg-[rgba(47,95,153,0.14)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-accent-strong)]">
                        Override
                      </span>
                    ) : (
                      <span className="rounded-full bg-[var(--admin-surface-alt)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
                        Default
                      </span>
                    )}
                    {isChanged ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                        Draft
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--admin-text-muted)]">{s.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
                    <span className="rounded-full bg-[var(--admin-surface-alt)] px-2.5 py-1">
                      Default: {String(s.defaultValue)}{s.unit ? ` ${s.unit}` : ''}
                    </span>
                    {s.min !== undefined && s.max !== undefined ? (
                      <span className="rounded-full bg-[var(--admin-surface-alt)] px-2.5 py-1">
                        Range: {s.min}-{s.max}{s.unit ? ` ${s.unit}` : ''}
                      </span>
                    ) : null}
                  </div>
                  {showWarning ? <p className="mt-3 text-xs font-medium text-amber-700">{s.warning}</p> : null}
                  {invalid ? (
                    <p className="mt-2 text-xs font-medium text-rose-700">
                      Must be between {s.min} and {s.max}{s.unit ? ` ${s.unit}` : ''}.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <label htmlFor={sk} className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-soft)]">
                    Current value
                  </label>
                  {s.type === 'boolean' ? (
                    <label className="flex items-center gap-3 rounded-[18px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-4 py-3 text-sm text-[var(--admin-text-primary)]">
                      <input
                        id={sk}
                        type="checkbox"
                        checked={Boolean(currentDraft)}
                        onChange={(event) => { updateDraft(s, event.target.checked); void saveNow() }}
                      />
                      Enabled
                    </label>
                  ) : (
                    <div className="rounded-[18px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-3">
                      <input
                        id={sk}
                        type={s.type === 'number' ? 'number' : 'text'}
                        value={String(currentDraft)}
                        onChange={(event) => updateDraft(s, event.target.value)}
                        onBlur={() => void saveNow()}
                        min={s.min}
                        max={s.max}
                        className={['foundation-field', invalid ? 'border-rose-300 bg-rose-50' : ''].join(' ')}
                      />
                      {s.unit ? <p className="mt-2 text-xs text-[var(--admin-text-muted)]">Unit: {s.unit}</p> : null}
                    </div>
                  )}

                  {isOverride ? (
                    <FoundationButton type="button" variant="secondary" size="sm" className="w-full" onClick={() => { resetToDefault(s); void saveNow() }}>
                      Reset to default
                    </FoundationButton>
                  ) : null}
                </div>
              </div>
            </FoundationSurface>
          )
        })}
      </div>

      {loadError ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p> : null}
    </div>
  )
}

function MetricCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: number | string
  tone?: 'default' | 'warning'
}) {
  return (
    <div
      className={[
        'rounded-[20px] border p-4',
        tone === 'warning'
          ? 'border-amber-200 bg-amber-50'
          : 'border-[var(--admin-border)] bg-[var(--admin-surface-alt)]',
      ].join(' ')}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-soft)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--admin-text-primary)]">{value}</p>
    </div>
  )
}
