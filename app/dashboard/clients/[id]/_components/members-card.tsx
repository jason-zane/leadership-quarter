'use client'

import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSelect } from '@/components/ui/foundation/field'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import { RelativeTime } from '@/components/ui/relative-time'
import {
  memberStatusOptions,
  roleOptions,
  type Member,
} from '../_lib/client-detail'

export function MembersCard({
  members,
  onUpdateMember,
  onRemoveMember,
}: {
  members: Member[]
  onUpdateMember: (memberId: string, patch: Partial<Pick<Member, 'role' | 'status'>>) => Promise<void>
  onRemoveMember: (memberId: string) => Promise<void>
}) {
  return (
    <FoundationSurface className="space-y-3 p-5">
      <h2 className="text-sm font-semibold text-[var(--admin-text-primary)]">Members</h2>
      <DashboardDataTableShell>
        <table className="w-full text-left text-sm">
          <thead className="bg-[rgba(255,255,255,0.68)] text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
            <tr>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Invited</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-[var(--admin-text-muted)]">
                  No members yet.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="border-t border-[rgba(103,127,159,0.12)]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--admin-text-primary)]">{member.email ?? member.user_id}</p>
                    <p className="text-xs text-[var(--admin-text-muted)]">{member.user_id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <FoundationSelect
                      value={member.role}
                      onChange={(event) => {
                        void onUpdateMember(member.id, { role: event.target.value as Member['role'] })
                      }}
                      className="h-9 text-xs"
                    >
                      {roleOptions.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </FoundationSelect>
                  </td>
                  <td className="px-4 py-3">
                    <FoundationSelect
                      value={member.status}
                      onChange={(event) => {
                        void onUpdateMember(member.id, {
                          status: event.target.value as Member['status'],
                        })
                      }}
                      className="h-9 text-xs"
                    >
                      {memberStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </FoundationSelect>
                  </td>
                  <td className="px-4 py-3 text-[var(--admin-text-muted)]">
                    <RelativeTime date={member.invited_at} />
                  </td>
                  <td className="px-4 py-3">
                    <FoundationButton
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        void onRemoveMember(member.id)
                      }}
                    >
                      Remove
                    </FoundationButton>
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
