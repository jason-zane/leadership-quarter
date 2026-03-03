import { createAdminClient } from '@/utils/supabase/admin'

type Props = {
  params: Promise<{ id: string; cohortId: string }>
}

export default async function SurveyCohortDetailPage({ params }: Props) {
  const { id, cohortId } = await params
  const adminClient = createAdminClient()

  if (!adminClient) {
    return <p className="text-sm text-red-600">Supabase service role is not configured.</p>
  }

  const [{ data: cohort }, { data: invitations }] = await Promise.all([
    adminClient.from('survey_cohorts').select('id, name, description, status').eq('id', cohortId).maybeSingle(),
    adminClient
      .from('survey_invitations')
      .select('id, first_name, last_name, email, status, completed_at, scores:survey_submissions(scores)')
      .eq('survey_id', id)
      .eq('cohort_id', cohortId)
      .order('created_at', { ascending: false }),
  ])

  if (!cohort) {
    return <p className="text-sm text-red-600">Cohort not found.</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{cohort.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">{cohort.description || 'No description'}</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Completed</th>
            </tr>
          </thead>
          <tbody>
            {(invitations ?? []).map((invitation) => (
              <tr key={invitation.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-4 py-3">{[invitation.first_name, invitation.last_name].filter(Boolean).join(' ')}</td>
                <td className="px-4 py-3">{invitation.email}</td>
                <td className="px-4 py-3 capitalize">{invitation.status}</td>
                <td className="px-4 py-3">{invitation.completed_at ? new Date(invitation.completed_at).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
