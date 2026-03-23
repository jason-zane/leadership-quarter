'use client'

import type { FormEvent } from 'react'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSelect } from '@/components/ui/foundation/field'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import {
  resolveAccessAssessment,
  type AccessRow,
  type Assessment,
} from '../_lib/client-detail'

export function AssessmentAccessCard({
  accessRows,
  assignableAssessments,
  selectedAssessment,
  busy,
  onSelectedAssessmentChange,
  onAssignAssessment,
  onToggleAccess,
  onRemoveAccess,
  onUpdateQuota,
}: {
  accessRows: AccessRow[]
  assignableAssessments: Assessment[]
  selectedAssessment: string
  busy: boolean
  onSelectedAssessmentChange: (value: string) => void
  onAssignAssessment: (event: FormEvent<HTMLFormElement>) => Promise<void>
  onToggleAccess: (accessId: string, enabled: boolean) => Promise<void>
  onRemoveAccess: (accessId: string) => Promise<void>
  onUpdateQuota: (accessId: string, quota: number | null) => Promise<void>
}) {
  return (
    <FoundationSurface className="space-y-3 p-5">
      <h2 className="text-sm font-semibold text-[var(--admin-text-primary)]">Assigned assessments</h2>
      <form
        onSubmit={(event) => {
          void onAssignAssessment(event)
        }}
        className="flex flex-wrap gap-3"
      >
        <FoundationSelect
          value={selectedAssessment}
          onChange={(event) => onSelectedAssessmentChange(event.target.value)}
        >
          <option value="">Select assessment</option>
          {assignableAssessments.map((assessment) => (
            <option key={assessment.id} value={assessment.id}>
              {assessment.name} ({assessment.key})
            </option>
          ))}
        </FoundationSelect>
        <FoundationButton type="submit" variant="primary" disabled={!selectedAssessment || busy}>
          Assign
        </FoundationButton>
      </form>

      <DashboardDataTableShell>
        <table className="w-full text-left text-sm">
          <thead className="bg-[rgba(255,255,255,0.68)] text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
            <tr>
              <th className="px-4 py-3">Assessment</th>
              <th className="px-4 py-3">Enabled</th>
              <th className="px-4 py-3">Used</th>
              <th className="px-4 py-3">Quota</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accessRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-[var(--admin-text-muted)]">
                  No assessment access rows yet.
                </td>
              </tr>
            ) : (
              accessRows.map((row) => {
                const assessment = resolveAccessAssessment(row)

                return (
                  <tr key={row.id} className="border-t border-[rgba(103,127,159,0.12)]">
                    <td className="px-4 py-3 text-[var(--admin-text-primary)]">
                      {assessment ? `${assessment.name} (${assessment.key})` : row.assessment_id}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={(event) => {
                          void onToggleAccess(row.id, event.target.checked)
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 text-[var(--admin-text-muted)]">
                      {row.quota_used ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        key={row.assessment_quota ?? 'null'}
                        type="number"
                        min="1"
                        placeholder="∞"
                        defaultValue={row.assessment_quota ?? ''}
                        className="w-20 rounded border border-[rgba(103,127,159,0.2)] px-2 py-1 text-center text-sm text-[var(--admin-text-primary)] placeholder-[var(--admin-text-soft)]"
                        onBlur={(e) => {
                          const raw = e.target.value.trim()
                          const quota = raw === '' ? null : parseInt(raw, 10)
                          if (quota !== null && (isNaN(quota) || quota < 1)) return
                          void onUpdateQuota(row.id, quota)
                        }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <FoundationButton
                        type="button"
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          void onRemoveAccess(row.id)
                        }}
                      >
                        Remove
                      </FoundationButton>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </DashboardDataTableShell>
    </FoundationSurface>
  )
}
