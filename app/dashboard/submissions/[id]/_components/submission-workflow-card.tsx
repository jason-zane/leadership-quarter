import {
  assignSubmissionOwner,
  markSubmissionFirstResponse,
  setSubmissionPriority,
  updateSubmissionStatus,
} from '@/app/dashboard/submissions/actions'
import type { OwnerProfile, SubmissionRow } from '../_lib/submission-detail'

export function SubmissionWorkflowCard({
  submission,
  owners,
}: {
  submission: SubmissionRow
  owners: OwnerProfile[]
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Workflow
      </h2>

      <form action={updateSubmissionStatus} className="mb-3 space-y-2">
        <input type="hidden" name="submission_id" value={submission.id} />
        <input type="hidden" name="contact_id" value={submission.contact_id ?? ''} />
        <input type="hidden" name="redirect_to" value={`/dashboard/submissions/${submission.id}`} />
        <select
          name="status"
          defaultValue={submission.status}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        >
          {['new', 'reviewed', 'qualified', 'closed'].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="w-full rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Save status
        </button>
      </form>

      <form action={assignSubmissionOwner} className="mb-3 space-y-2">
        <input type="hidden" name="submission_id" value={submission.id} />
        <input type="hidden" name="redirect_to" value={`/dashboard/submissions/${submission.id}`} />
        <select
          name="owner_user_id"
          defaultValue={submission.owner_user_id ?? ''}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        >
          <option value="">Unassigned</option>
          {owners.map((owner) => (
            <option key={owner.user_id} value={owner.user_id}>
              {owner.full_name || owner.user_id}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="w-full rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Assign owner
        </button>
      </form>

      <form action={setSubmissionPriority} className="mb-3 space-y-2">
        <input type="hidden" name="submission_id" value={submission.id} />
        <input type="hidden" name="redirect_to" value={`/dashboard/submissions/${submission.id}`} />
        <select
          name="priority"
          defaultValue={submission.priority}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        >
          <option value="low">low</option>
          <option value="normal">normal</option>
          <option value="high">high</option>
        </select>
        <button
          type="submit"
          className="w-full rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Save priority
        </button>
      </form>

      <form action={markSubmissionFirstResponse}>
        <input type="hidden" name="submission_id" value={submission.id} />
        <input type="hidden" name="redirect_to" value={`/dashboard/submissions/${submission.id}`} />
        <button
          type="submit"
          className="w-full rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Mark first response now
        </button>
      </form>
    </div>
  )
}
