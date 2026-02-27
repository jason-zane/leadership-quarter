'use client'

import { useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { ActionMenu } from '@/components/ui/action-menu'
import { updateUserRole, sendPasswordResetEmail, resetUserMfa, removeUser } from '@/app/dashboard/users/actions'

type DialogType = 'edit-role' | 'confirm-reset-mfa' | 'confirm-remove' | null

export function UserRowActions({
  userId,
  email,
  currentRole,
  isSelf,
}: {
  userId: string
  email: string
  currentRole: 'admin' | 'staff'
  isSelf: boolean
}) {
  const [openDialog, setOpenDialog] = useState<DialogType>(null)
  const resetPasswordFormRef = useRef<HTMLFormElement>(null)
  const resetMfaFormRef = useRef<HTMLFormElement>(null)
  const removeFormRef = useRef<HTMLFormElement>(null)

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
            label: 'Reset MFA',
            onSelect: () => setOpenDialog('confirm-reset-mfa'),
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

      {/* Reset MFA Confirm */}
      <AlertDialog.Root
        open={openDialog === 'confirm-reset-mfa'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <AlertDialog.Title className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Reset MFA for this user?
            </AlertDialog.Title>
            <AlertDialog.Description className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
              This removes all authenticator factors for <strong className="text-zinc-700 dark:text-zinc-300">{email}</strong>. They will be required to re-enrol on next login.
            </AlertDialog.Description>
            <form ref={resetMfaFormRef} action={resetUserMfa} className="hidden">
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
                  onClick={() => resetMfaFormRef.current?.requestSubmit()}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Reset MFA
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

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
