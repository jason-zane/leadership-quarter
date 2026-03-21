'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ActionMenu, type ActionItem } from '@/components/ui/action-menu'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import {
  getV2ReportAudienceRoleLabel,
  type V2AssessmentReportRecord,
  type V2AssessmentReportStatus,
} from '@/utils/reports/assessment-report-records'
import { hasV2ReportOverrides } from '@/utils/reports/assessment-report-inheritance'

type LoadPayload = {
  ok?: boolean
  reports?: V2AssessmentReportRecord[]
  baseReport?: V2AssessmentReportRecord | null
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <FoundationSurface className="p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--admin-text-soft)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--admin-text-primary)]">{value}</p>
    </FoundationSurface>
  )
}

function getStatusBadge(status: V2AssessmentReportStatus) {
  switch (status) {
    case 'published':
      return 'bg-emerald-100 text-emerald-700'
    case 'archived':
      return 'bg-zinc-100 text-zinc-600'
    default:
      return 'bg-amber-100 text-amber-700'
  }
}

export default function AssessmentReportsPage() {
  const { id: assessmentId } = useParams<{ id: string }>()
  const router = useRouter()

  const [reports, setReports] = useState<V2AssessmentReportRecord[]>([])
  const [baseReportId, setBaseReportId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [busyActionId, setBusyActionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const baseReport = useMemo(
    () => reports.find((report) => report.id === baseReportId) ?? null,
    [baseReportId, reports]
  )
  const audienceReports = useMemo(
    () => reports.filter((report) => report.reportKind === 'audience'),
    [reports]
  )
  const publishedReports = useMemo(
    () => audienceReports.filter((report) => report.status === 'published'),
    [audienceReports]
  )
  const defaultReport = useMemo(
    () => audienceReports.find((report) => report.isDefault && report.status === 'published') ?? null,
    [audienceReports]
  )
  const customizedReports = useMemo(
    () => audienceReports.filter((report) => hasV2ReportOverrides(report)).length,
    [audienceReports]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const reportsResponse = await fetch(`/api/admin/assessments/${assessmentId}/reports`, {
        cache: 'no-store',
      })
      const reportsBody = await reportsResponse.json().catch(() => null) as LoadPayload | null

      if (!reportsResponse.ok || !reportsBody?.ok) {
        setError('Failed to load reports.')
        return
      }

      const nextReports = reportsBody.reports ?? []
      setReports(nextReports)
      setBaseReportId(reportsBody.baseReport?.id ?? nextReports.find((report) => report.reportKind === 'base')?.id ?? null)
    } catch {
      setError('Failed to load reports.')
    } finally {
      setLoading(false)
    }
  }, [assessmentId])

  useEffect(() => {
    void load()
  }, [load])

  const createReport = async () => {
    setCreating(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const body = await response.json().catch(() => null) as { ok?: boolean; report?: { id?: string } } | null

      if (!response.ok || !body?.ok || !body.report?.id) {
        setError('Could not create report.')
        return
      }

      router.push(`/dashboard/assessments/${assessmentId}/reports/${body.report.id}`)
    } catch {
      setError('Could not create report.')
    } finally {
      setCreating(false)
    }
  }

  const patchReport = async (
    reportId: string,
    payload: Partial<{
      status: V2AssessmentReportStatus
      isDefault: boolean
    }>
  ) => {
    setBusyActionId(reportId)
    setError(null)

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await response.json().catch(() => null)

      if (!response.ok || !body?.ok) {
        setError('Could not update report.')
        return
      }

      await load()
    } catch {
      setError('Could not update report.')
    } finally {
      setBusyActionId(null)
    }
  }

  const duplicateReport = async (reportId: string) => {
    setBusyActionId(reportId)
    setError(null)

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/reports/${reportId}/duplicate`, {
        method: 'POST',
      })
      const body = await response.json().catch(() => null)

      if (!response.ok || !body?.ok) {
        setError('Could not duplicate report.')
        return
      }

      await load()
    } catch {
      setError('Could not duplicate report.')
    } finally {
      setBusyActionId(null)
    }
  }

  const menuItems = (report: V2AssessmentReportRecord): ActionItem[] => {
    const items: ActionItem[] = [
      {
        type: 'item',
        label: 'Open composer',
        onSelect: () => {
          router.push(`/dashboard/assessments/${assessmentId}/reports/${report.id}`)
        },
      },
      {
        type: 'item',
        label: 'Preview',
        onSelect: () => {
          router.push(`/dashboard/assessments/${assessmentId}/reports/${report.id}?tab=preview`)
        },
      },
      { type: 'separator' },
      {
        type: 'item',
        label: 'Duplicate',
        onSelect: () => {
          void duplicateReport(report.id)
        },
        disabled: busyActionId === report.id,
      },
    ]

    if (report.reportKind === 'audience' && report.status === 'published' && !report.isDefault) {
      items.push({
        type: 'item',
        label: 'Make default',
        onSelect: () => {
          void patchReport(report.id, { isDefault: true })
        },
        disabled: busyActionId === report.id,
      })
    }

    if (report.reportKind === 'audience') {
      items.push({ type: 'separator' })
      if (report.status === 'archived') {
        items.push({
          type: 'item',
          label: 'Restore to draft',
          onSelect: () => {
            void patchReport(report.id, { status: 'draft', isDefault: false })
          },
          disabled: busyActionId === report.id,
        })
      } else {
        items.push({
          type: 'item',
          label: 'Archive',
          onSelect: () => {
            void patchReport(report.id, { status: 'archived', isDefault: false })
          },
          destructive: true,
          disabled: busyActionId === report.id,
        })
      }
    }

    return items
  }

  if (loading) {
    return (
      <DashboardPageShell>
        <DashboardPageHeader
          eyebrow="Assessment workspace"
          title="Reports"
          description="Loading the reports workspace..."
        />
        <FoundationSurface className="p-6">
          <p className="text-sm text-[var(--admin-text-muted)]">Loading the reports workspace...</p>
        </FoundationSurface>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Assessment workspace"
        title="Reports"
        description="Manage the shared base composition, create audience variants from it, and open each report to preview or edit it."
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <FoundationButton
              type="button"
              variant="primary"
              size="sm"
              onClick={() => void createReport()}
              disabled={creating}
            >
              {creating ? 'Creating...' : 'New audience report'}
            </FoundationButton>
          </div>
        )}
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Audience reports" value={audienceReports.length} />
        <MetricCard label="Published" value={publishedReports.length} />
        <MetricCard label="Default report" value={defaultReport?.name ?? 'Not set'} />
        <MetricCard label="Customized" value={customizedReports} />
      </div>

      <div className="space-y-4">
        <FoundationSurface className="p-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Report library</h2>
            <p className="text-sm text-[var(--admin-text-muted)]">
              The base composition defines the shared report spine. Audience reports inherit from it until they are locally customized. Open any report from here when you want to preview it.
            </p>
          </div>

          {baseReport ? (
            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--admin-text-soft)]">Base composition</p>
              <FoundationSurface className="mt-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-[var(--admin-text-primary)]">{baseReport.name}</p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-700">
                        Shared base
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--admin-text-muted)]">
                      <span>{baseReport.templateDefinition.composition?.sections.length ?? 0} sections</span>
                      <span>{baseReport.templateDefinition.blocks.length} blocks</span>
                    </div>
                  </div>

                  <ActionMenu items={menuItems(baseReport)} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/assessments/${assessmentId}/reports/${baseReport.id}`}
                    className="foundation-btn foundation-btn-secondary foundation-btn-sm"
                  >
                    Open base
                  </Link>
                  <Link
                    href={`/dashboard/assessments/${assessmentId}/reports/${baseReport.id}?tab=preview`}
                    className="foundation-btn foundation-btn-secondary foundation-btn-sm"
                  >
                    Open preview
                  </Link>
                </div>
              </FoundationSurface>
            </div>
          ) : null}

          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--admin-text-soft)]">Audience variants</p>
            <div className="mt-3 grid gap-3">
              {audienceReports.map((report) => (
                <FoundationSurface key={report.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-[var(--admin-text-primary)]">{report.name}</p>
                        {report.isDefault ? (
                          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-sky-700">
                            Default
                          </span>
                        ) : null}
                        <span className="rounded-full bg-[var(--admin-surface-alt)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--admin-text-muted)]">
                          {hasV2ReportOverrides(report) ? 'Customized' : 'Inheriting base'}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--admin-text-muted)]">
                        <span className="rounded-full bg-[var(--admin-surface-alt)] px-2.5 py-1 font-medium uppercase tracking-wide">
                          {getV2ReportAudienceRoleLabel(report.audienceRole)}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 font-medium uppercase tracking-wide ${getStatusBadge(report.status)}`}>
                          {report.status}
                        </span>
                        <span>{report.templateDefinition.composition?.sections.length ?? 0} sections</span>
                      </div>
                    </div>

                    <ActionMenu items={menuItems(report)} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/dashboard/assessments/${assessmentId}/reports/${report.id}`}
                      className="foundation-btn foundation-btn-secondary foundation-btn-sm"
                    >
                      Open composer
                    </Link>
                    <Link
                      href={`/dashboard/assessments/${assessmentId}/reports/${report.id}?tab=preview`}
                      className="foundation-btn foundation-btn-secondary foundation-btn-sm"
                    >
                      Open preview
                    </Link>
                    <Link
                      href={`/dashboard/assessments/${assessmentId}/reports/${report.id}?tab=advanced`}
                      className="foundation-btn foundation-btn-ghost foundation-btn-sm"
                    >
                      Advanced
                    </Link>
                  </div>
                </FoundationSurface>
              ))}

              {audienceReports.length === 0 ? (
                <FoundationSurface className="border-dashed p-6">
                  <p className="text-sm text-[var(--admin-text-muted)]">No audience reports exist yet.</p>
                </FoundationSurface>
              ) : null}
            </div>
          </div>
        </FoundationSurface>
      </div>
    </DashboardPageShell>
  )
}
