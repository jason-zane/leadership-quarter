import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'

type AssessmentRow = {
  id: string
  name: string
  status: string
  is_public: boolean
  updated_at: string
}

export default async function AssessmentsPage() {
  const adminClient = createAdminClient()

  if (!adminClient) {
    return <p className="text-sm text-red-600">Supabase service role is not configured.</p>
  }

  const { data } = await adminClient
    .from('assessments')
    .select('id, name, status, is_public, updated_at')
    .order('updated_at', { ascending: false })

  const assessments = (data ?? []) as AssessmentRow[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Assessments</h1>
        <Link
          href="/dashboard/assessments/new"
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          New assessment
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {assessments.map((assessment) => (
              <tr key={assessment.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/assessments/${assessment.id}`}
                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                  >
                    {assessment.name}
                  </Link>
                </td>
                <td className="px-4 py-3 capitalize">{assessment.status}</td>
                <td className="px-4 py-3">{assessment.is_public ? 'Public' : 'Private'}</td>
                <td className="px-4 py-3">{new Date(assessment.updated_at).toLocaleString()}</td>
              </tr>
            ))}
            {assessments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-zinc-500">
                  No assessments found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
