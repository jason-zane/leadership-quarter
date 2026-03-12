'use client'

import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationInput } from '@/components/ui/foundation/field'

export function ClientDangerZone({
  organisationName,
  showDeleteConfirm,
  deleteConfirmName,
  deleting,
  deleteError,
  onShowDeleteConfirm,
  onDeleteConfirmNameChange,
  onDelete,
  onCancel,
}: {
  organisationName: string
  showDeleteConfirm: boolean
  deleteConfirmName: string
  deleting: boolean
  deleteError: string | null
  onShowDeleteConfirm: () => void
  onDeleteConfirmNameChange: (value: string) => void
  onDelete: () => Promise<void>
  onCancel: () => void
}) {
  return (
    <section className="rounded-[22px] border border-red-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-red-700">Danger zone</p>
        <h2 className="text-sm font-semibold text-[var(--admin-text-primary)]">Delete client</h2>
        <p className="text-sm text-[var(--admin-text-muted)]">
          Permanently delete this client. Memberships and assessment access will be removed, and linked
          campaigns will be detached from the client.
        </p>
      </div>

      {!showDeleteConfirm ? (
        <div className="mt-4">
          <FoundationButton type="button" variant="danger" onClick={onShowDeleteConfirm}>
            Delete client
          </FoundationButton>
        </div>
      ) : (
        <div className="mt-4 space-y-3 rounded-[18px] border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-red-700">
            Type <span className="font-mono normal-case tracking-normal">{organisationName}</span> to confirm
          </p>
          <FoundationInput
            value={deleteConfirmName}
            onChange={(event) => onDeleteConfirmNameChange(event.target.value)}
            placeholder={organisationName}
          />
          <div className="flex flex-wrap items-center gap-3">
            <FoundationButton
              type="button"
              variant="danger"
              disabled={deleting || deleteConfirmName !== organisationName}
              onClick={() => {
                void onDelete()
              }}
            >
              {deleting ? 'Deleting...' : 'Permanently delete'}
            </FoundationButton>
            <FoundationButton type="button" variant="secondary" disabled={deleting} onClick={onCancel}>
              Cancel
            </FoundationButton>
          </div>
          {deleteError ? <p className="text-sm text-red-600">{deleteError}</p> : null}
        </div>
      )}
    </section>
  )
}
