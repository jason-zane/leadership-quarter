'use client'

import { useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { inviteUser } from '@/app/dashboard/users/actions'
import { PlusIcon } from '@/components/icons'

export function InviteUserDialog() {
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
          <PlusIcon className="h-3.5 w-3.5" />
          Invite User
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <Dialog.Title className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Invite a new user
          </Dialog.Title>
          <Dialog.Description className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
            They&apos;ll receive an email to set their password and access the backend.
          </Dialog.Description>

          <form ref={formRef} action={inviteUser} className="space-y-4">
            <div>
              <label
                htmlFor="invite-email"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Email address
              </label>
              <input
                id="invite-email"
                name="email"
                type="email"
                required
                autoComplete="off"
                placeholder="jane@example.com"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Role</p>
              <div className="space-y-2">
                {[
                  { value: 'staff', label: 'Staff', desc: 'Can view and manage CRM data' },
                  { value: 'admin', label: 'Admin', desc: 'Full access including user management' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50"
                  >
                    <input
                      type="radio"
                      name="role"
                      value={opt.value}
                      defaultChecked={opt.value === 'staff'}
                      className="mt-0.5 accent-zinc-900 dark:accent-zinc-400"
                    />
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{opt.label}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
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
                Send invite
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
