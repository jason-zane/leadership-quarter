import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'

type Props = {
  params: Promise<{ id: string; submissionId: string }>
}

export default async function SurveyResponseDetailPage({ params }: Props) {
  const { id, submissionId } = await params
  const adminClient = createAdminClient()

  if (!adminClient) {
    return <p className="text-sm text-red-600">Supabase service role is not configured.</p>
  }

  const { data } = await adminClient
    .from('assessment_submissions')
    .select('id, first_name, last_name, email, organisation, role, scores, bands, classification, recommendations, responses, created_at')
    .eq('assessment_id', id)
    .eq('id', submissionId)
    .maybeSingle()

  if (!data) {
    return <p className="text-sm text-red-600">Response not found.</p>
  }

  const classification = (data.classification as { label?: string } | null)?.label ?? 'Unknown'
  const bands = (data.bands as Record<string, string> | null) ?? {}
  const scores = (data.scores as Record<string, number> | null) ?? {}
  const recommendations = Array.isArray(data.recommendations) ? data.recommendations : []
  const responses = (data.responses as Record<string, number> | null) ?? {}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{classification}</h1>
        <Link href={`/dashboard/assessments/${id}/responses`} className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
          Back to responses
        </Link>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500">Respondent</p>
        <p className="mt-1 text-lg font-medium">{[data.first_name, data.last_name].filter(Boolean).join(' ')}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{data.email}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{data.organisation} • {data.role}</p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Scores</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {Object.keys(scores).map((key) => (
            <div key={key} className="rounded border border-zinc-200 p-3 dark:border-zinc-700">
              <p className="text-xs uppercase text-zinc-500">{key}</p>
              <p className="mt-1 text-xl font-semibold">{scores[key]}</p>
              <p className="text-xs text-zinc-500">{bands[key] ?? '-'}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Recommendations</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {recommendations.map((item) => (
            <li key={String(item)}>{String(item)}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Raw responses</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="py-2">Question</th>
                <th className="py-2">Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(responses).map(([key, value]) => (
                <tr key={key} className="border-t border-zinc-200 dark:border-zinc-700">
                  <td className="py-2">{key}</td>
                  <td className="py-2">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Link href="/framework/lq-ai-readiness/orientation-survey/report" className="inline-block rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
        View full report
      </Link>
    </div>
  )
}
