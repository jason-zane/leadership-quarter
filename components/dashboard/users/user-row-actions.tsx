'use client'

import { useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { ActionMenu } from '@/components/ui/action-menu'
import {
  attachUserToClient,
  updateUserRole,
  sendPasswordResetEmail,
  removeUser,
  togglePortalAdminAccess,
} from '@/app/dashboard/users/actions'

type DialogType = 'attach-client' | 'edit-role' | 'confirm-remove' | null

const portalRoleOptions = [
  { value: 'org_owner', label: 'Org owner' },
  { value: 'org_admin', label: 'Org admin' },
  { value: 'campaign_manager', label: 'Campaign manager' },
  { value: 'viewer', label: 'Viewer' },
] as const

export function UserRowActions({
  userId,
  email,
  currentRole,
  portalAdminAccess,
  organisations,
  currentPortalMember,
  isSelf,
}: {
  userId: string
  email: string
  currentRole: 'admin' | 'staff'
  portalAdminAccess: boolean
  organisations: Array<{ id: string; name: string; status: string }>
  currentPortalMember: {
    orgId: string
    orgName: string
    portalRole: string
    status: string
  } | null
  isSelf: boolean
}) {
  const [openDialog, setOpenDialog] = useState<DialogType>(null)
  const [selectedOrganisationId, setSelectedOrganisationId] = useState(
    currentPortalMember?.orgId ?? organisations[0]?.id ?? ''
  )
  const [selectedPortalRole, setSelectedPortalRole] = useState(
    (currentPortalMember?.portalRole ?? 'viewer') as
      | 'org_owner'
      | 'org_admin'
      | 'campaign_manager'
      | 'viewer'
  )
  const resetPasswordFormRef = useRef<HTMLFormElement>(null)
  const portalAdminAccessFormRef = useRef<HTMLFormElement>(null)
  const removeFormRef = useRef<HTMLFormElement>(null)

  function openAttachClientDialog() {
    setSelectedOrganisationId(currentPortalMember?.orgId ?? organisations[0]?.id ?? '')
    setSelectedPortalRole(
      (currentPortalMember?.portalRole ?? 'viewer') as
        | 'org_owner'
        | 'org_admin'
        | 'campaign_manager'
        | 'viewer'
    )
    setOpenDialog('attach-client')
  }

  return (
    <>
      <ActionMenu
        items={[
          { type: 'item', label: 'Edit role', onSelect: () => setOpenDialog('edit-role') },
          {
            type: 'item',
            label: 'Send password reset',
            onSelect: () => resetPasswordFormRef.current?.requestSubmit(),
          },
          {
            type: 'item',
            label: portalAdminAccess
              ? 'Turn off client portal launch'
              : 'Turn on client portal launch',
            onSelect: () => portalAdminAccessFormRef.current?.requestSubmit(),
            disabled: currentRole !== 'admin',
          },
          {
            type: 'item',
            label: currentPortalMember ? 'Manage client membership' : 'Add to client portal',
            onSelect: openAttachClientDialog,
            disabled: organisations.length === 0,
          },
          { type: 'separator' },
          {
            type: 'item',
            label: 'Remove user',
            onSelect: () => setOpenDialog('confirm-remove'),
            destructive: true,
            disabled: isSelf,
          },
        ]}
      />

      {/* Hidden forms for direct-submit actions */}
      <form ref={resetPasswordFormRef} action={sendPasswordResetEmail} className="hidden">
        <input type="hidden" name="email" value={email} />
      </form>
      <form
        ref={portalAdminAccessFormRef}
        action={togglePortalAdminAccess}
        className="hidden"
      >
        <input type="hidden" name="user_id" value={userId} />
        <input type="hidden" name="enabled" value={portalAdminAccess ? 'false' : 'true'} />
      </form>

      <Dialog.Root
        open={openDialog === 'attach-client'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <Dialog.Title className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {currentPortalMember ? 'Manage client membership' : 'Add to client portal'}
            </Dialog.Title>
            <Dialog.Description className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              {email}
            </Dialog.Description>

            <form
              action={attachUserToClient}
              onSubmit={() => setOpenDialog(null)}
              className="space-y-4"
            >
              <input type="hidden" name="user_id" value={userId} />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Client
                </label>
                <select
                  name="organisation_id"
                  value={selectedOrganisationId}
                  disabled={Boolean(currentPortalMember)}
                  onChange={(event) => setSelectedOrganisationId(event.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400 dark:disabled:bg-zinc-800/60"
                >
                  {organisations.map((organisation) => (
                    <option key={organisation.id} value={organisation.id}>
                      {organisation.name}
                      {organisation.status === 'active' ? '' : ` (${organisation.status})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Portal role
                </label>
                <select
                  name="portal_role"
                  value={selectedPortalRole}
                  onChange={(event) =>
                    setSelectedPortalRole(
                      event.target.value as 'org_owner' | 'org_admin' | 'campaign_manager' | 'viewer'
                    )
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
                >
                  {portalRoleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {currentPortalMember ? (
                <p className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-zinc-800/70 dark:text-zinc-400">
                  This user already belongs to {currentPortalMember.orgName}. To move them to a
                  different client, remove that membership first from the client workspace.
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-1">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Save membership
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Edit Role Dialog */}
      <Dialog.Root
        open={openDialog === 'edit-role'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <Dialog.Title className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Edit role
            </Dialog.Title>
            <Dialog.Description className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              {email}
            </Dialog.Description>

            <form
              action={updateUserRole}
              onSubmit={() => setOpenDialog(null)}
              className="space-y-3"
            >
              <input type="hidden" name="user_id" value={userId} />
              <div className="space-y-2">
                {([
                  { value: 'staff', label: 'Staff', desc: 'Can view and manage CRM data' },
                  { value: 'admin', label: 'Admin', desc: 'Full access including user management' },
                ] as const).map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50"
                  >
                    <input
                      type="radio"
                      name="role"
                      value={opt.value}
                      defaultChecked={currentRole === opt.value}
                      className="mt-0.5 accent-zinc-900 dark:accent-zinc-400"
                    />
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{opt.label}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Save role
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Remove User Confirm */}
      <AlertDialog.Root
        open={openDialog === 'confirm-remove'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <AlertDialog.Title className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Remove this user?
            </AlertDialog.Title>
            <AlertDialog.Description className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
              This permanently deletes <strong className="text-zinc-700 dark:text-zinc-300">{email}</strong>&apos;s account and revokes all access. This cannot be undone.
            </AlertDialog.Description>
            <form ref={removeFormRef} action={removeUser} className="hidden">
              <input type="hidden" name="user_id" value={userId} />
            </form>
            <div className="flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <button className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  Cancel
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={() => removeFormRef.current?.requestSubmit()}
                  className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  Remove user
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  )
}
