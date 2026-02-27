'use client'

import { useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ActionMenu } from '@/components/ui/action-menu'
import { updateSubmissionStatus, linkSubmissionContact } from '@/app/dashboard/submissions/actions'

const submissionStatuses = ['new', 'reviewed', 'qualified', 'closed'] as const
type SubmissionStatus = (typeof submissionStatuses)[number]

export function SubmissionRowActions({
  submissionId,
  currentStatus,
  contactId,
  firstName,
  lastName,
  email,
  source,
}: {
  submissionId: string
  currentStatus: string
  contactId: string | null
  firstName: string
  lastName: string
  email: string
  source: string | null
}) {
  const [openDialog, setOpenDialog] = useState<'change-status' | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<SubmissionStatus>(
    (submissionStatuses as readonly string[]).includes(currentStatus)
      ? (currentStatus as SubmissionStatus)
      : 'new'
  )
  const linkFormRef = useRef<HTMLFormElement>(null)

  const items = [
    {
      type: 'item' as const,
      label: 'Change status',
      onSelect: () => setOpenDialog('change-status'),
    },
    {
      type: 'item' as const,
      label: 'Open details',
      onSelect: () => {
        window.location.href = `/dashboard/submissions/${submissionId}`
      },
    },
    { type: 'separator' as const },
    ...(contactId
      ? [
          {
            type: 'item' as const,
            label: 'View contact',
            onSelect: () => {
              window.location.href = `/dashboard/contacts/${contactId}`
            },
          },
        ]
      : [
          {
            type: 'item' as const,
            label: 'Create contact',
            onSelect: () => linkFormRef.current?.requestSubmit(),
          },
        ]),
  ]

  return (
    <>
      <ActionMenu items={items} />

      {/* Hidden form for link/create contact */}
      <form ref={linkFormRef} action={linkSubmissionContact} className="hidden">
        <input type="hidden" name="submission_id" value={submissionId} />
        <input type="hidden" name="redirect_to" value="/dashboard/submissions" />
        <input type="hidden" name="first_name" value={firstName} />
        <input type="hidden" name="last_name" value={lastName} />
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="source" value={source ?? ''} />
      </form>

      {/* Change Status Dialog */}
      <Dialog.Root
        open={openDialog === 'change-status'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <Dialog.Title className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Update status
            </Dialog.Title>
            <Dialog.Description className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              {firstName} {lastName}
            </Dialog.Description>

            <form
              action={updateSubmissionStatus}
              onSubmit={() => setOpenDialog(null)}
              className="space-y-3"
            >
              <input type="hidden" name="submission_id" value={submissionId} />
              <input type="hidden" name="contact_id" value={contactId ?? ''} />
              <input type="hidden" name="redirect_to" value="/dashboard/submissions" />
              <div className="space-y-1.5">
                {submissionStatuses.map((status) => (
                  <label
                    key={status}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2.5 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50"
                  >
                    <input
                      type="radio"
                      name="status"
                      value={status}
                      checked={selectedStatus === status}
                      onChange={() => setSelectedStatus(status)}
                      className="accent-zinc-900 dark:accent-zinc-400"
                    />
                    <span className="text-sm font-medium capitalize text-zinc-900 dark:text-zinc-50">
                      {status}
                    </span>
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
                  Save
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
