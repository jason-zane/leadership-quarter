import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import type { AuditLog } from '../_lib/client-detail'

export function AuditActivityCard({ auditLogs }: { auditLogs: AuditLog[] }) {
  return (
    <FoundationSurface className="space-y-3 p-5">
      <h2 className="text-sm font-semibold text-[var(--admin-text-primary)]">Audit activity</h2>
      <DashboardDataTableShell>
        <table className="w-full text-left text-sm">
          <thead className="bg-[rgba(255,255,255,0.68)] text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Target</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--admin-text-muted)]">
                  No audit activity yet.
                </td>
              </tr>
            ) : (
              auditLogs.map((log) => (
                <tr key={log.id} className="border-t border-[rgba(103,127,159,0.12)]">
                  <td className="px-4 py-3 text-[var(--admin-text-muted)]">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--admin-text-primary)]">
                    {log.action}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--admin-text-muted)]">
                    {log.actor_user_id}
                  </td>
                  <td className="px-4 py-3 text-[var(--admin-text-muted)]">
                    {log.target_email ?? log.target_user_id ?? '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DashboardDataTableShell>
    </FoundationSurface>
  )
}
