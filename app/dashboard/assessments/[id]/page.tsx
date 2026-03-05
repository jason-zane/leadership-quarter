import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'
import { CopyLinkButton } from './_components/copy-link-button'
import { AssessmentExperienceConfigEditor } from '@/components/dashboard/assessments/experience-config-editor'

type Props = {
  params: Promise<{ id: string }>
}

function getSiteUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  return url ? url.replace(/\/$/, '') : 'http://localhost:3000'
}

type AssessmentRow = {
  id: string
  name: string
  key: string
  status: string
  is_public: boolean
  public_url?: string | null
  runner_config?: unknown
  report_config?: unknown
  created_at: string
}

type ResponseRow = {
  id: string
  first_name: string | null
  last_name: string | null
  organisation: string | null
  classification: unknown
  created_at: string
}

export default async function AssessmentOverviewPage({ params }: Props) {
  const { id } = await params
  const adminClient = createAdminClient()

  if (!adminClient) {
    return <p className="text-sm text-red-600">Supabase service role is not configured.</p>
  }

  let assessment: AssessmentRow | null = null
  let responseCount: number | null = null
  let pendingCount: number | null = null
  let recentResponses: ResponseRow[] | null = null

  try {
    const [sRes, rcRes, pcRes, rrRes] = await Promise.all([
      adminClient
        .from('assessments')
        .select('id, name, key, status, is_public, public_url, runner_config, report_config, created_at')
        .eq('id', id)
        .maybeSingle(),
      adminClient.from('assessment_submissions').select('id', { count: 'exact', head: true }).eq('assessment_id', id),
      adminClient.from('assessment_invitations').select('id', { count: 'exact', head: true }).eq('assessment_id', id).eq('status', 'pending'),
      adminClient
        .from('assessment_submissions')
        .select('id, first_name, last_name, organisation, classification, created_at')
        .eq('assessment_id', id)
        .order('created_at', { ascending: false })
        .limit(5),
    ])
    if (sRes.error) throw sRes.error
    assessment = sRes.data as AssessmentRow | null
    responseCount = rcRes.count
    pendingCount = pcRes.count
    recentResponses = rrRes.data as ResponseRow[] | null
  } catch (err) {
    return <p className="text-sm text-red-600">Failed to load assessment: {String(err)}</p>
  }

  if (!assessment) {
    return <p className="text-sm text-red-600">Assessment not found.</p>
  }

  const publicUrl = assessment.public_url
  const surveyLink = publicUrl ? `${getSiteUrl()}${publicUrl}` : null

  const createdAt = new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric' }).format(new Date(assessment.created_at))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{assessment.name}</h1>
              <span className={[
                'rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                assessment.status === 'active'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
              ].join(' ')}>
                {assessment.status}
              </span>
              {assessment.is_public && (
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  Public
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-500">Created {createdAt}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {surveyLink && <CopyLinkButton url={surveyLink} />}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Responses</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">{responseCount ?? 0}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Pending invitations</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">{pendingCount ?? 0}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Last response</p>
          <p className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {recentResponses?.[0]
              ? new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' }).format(new Date(recentResponses[0].created_at))
              : '—'}
          </p>
        </div>
      </div>

      {/* Recent responses */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recent responses</h2>
          <Link href={`/dashboard/assessments/${id}/responses`} className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            View all →
          </Link>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
            <tr>
              <th className="px-5 py-3 font-medium">Respondent</th>
              <th className="px-5 py-3 font-medium">Organisation</th>
              <th className="px-5 py-3 font-medium">Classification</th>
              <th className="px-5 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {(recentResponses ?? []).length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-sm text-zinc-400">No responses yet.</td>
              </tr>
            ) : (
              (recentResponses ?? []).map((row) => {
                const classification = (row.classification as { label?: string } | null)?.label ?? 'Unknown'
                const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || '—'
                return (
                  <tr key={row.id} className="border-t border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40">
                    <td className="px-5 py-3 font-medium">{name}</td>
                    <td className="px-5 py-3 text-zinc-500">{row.organisation || '—'}</td>
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/assessments/${id}/responses/${row.id}`} className="hover:underline">
                        {classification}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-zinc-500">
                      {new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' }).format(new Date(row.created_at))}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <AssessmentExperienceConfigEditor
        assessmentId={id}
        initialRunnerConfig={assessment.runner_config ?? {}}
        initialReportConfig={assessment.report_config ?? {}}
      />
    </div>
  )
}
