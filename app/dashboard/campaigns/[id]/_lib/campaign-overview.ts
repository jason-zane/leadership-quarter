import {
  DEFAULT_RUNNER_CONFIG,
  normalizeRunnerConfig,
} from '@/utils/assessments/experience-config'
import type { CampaignConfig, CampaignStatus } from '@/utils/assessments/campaign-types'
import {
  RUNNER_FIELD_KEYS,
  type RunnerOverrideConfig,
} from '@/components/dashboard/config-editor/runner-config-form'

export type CampaignAssessment = {
  id: string
  assessment_id: string
  sort_order?: number
  is_active: boolean
  assessments: {
    id: string
    key: string
    name: string
    external_name: string
    description?: string | null
    status: string
    runner_config?: unknown
  } | null
}

export type Campaign = {
  id: string
  name: string
  external_name: string
  slug: string
  status: CampaignStatus
  config: CampaignConfig
  runner_overrides?: Record<string, unknown>
  organisation_id: string | null
  created_at: string
  updated_at: string
  organisations: { id: string; name: string; slug: string } | null
  campaign_assessments: CampaignAssessment[]
}

export type Organisation = {
  id: string
  name: string
  slug: string
}

export const statusColors: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  archived: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export const STATUS_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ['active'],
  active: ['closed'],
  closed: ['archived', 'active'],
  archived: [],
}

export function getSiteUrl() {
  return typeof window !== 'undefined' ? window.location.origin : ''
}

export function normalizeCampaignSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

export function isValidHref(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return true
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('?')) return true
  if (trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) return true

  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function hasErrors(value: Record<string, string | undefined>) {
  return Object.values(value).some(Boolean)
}

export function getKnownRunnerOverrides(rawOverrides: Record<string, unknown>): RunnerOverrideConfig {
  const normalizedOverrides = normalizeRunnerConfig({ ...DEFAULT_RUNNER_CONFIG, ...rawOverrides })

  return Object.fromEntries(
    Object.keys(rawOverrides)
      .filter((key) => RUNNER_FIELD_KEYS.has(key))
      .map((key) => [key, normalizedOverrides[key as keyof typeof normalizedOverrides]])
  ) as RunnerOverrideConfig
}
