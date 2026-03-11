import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'
import { CopyLinkButton } from './_components/copy-link-button'
import { AssessmentBuildHealth } from './_components/assessment-build-health'
import { AssessmentDangerZone } from './_components/assessment-danger-zone'
import { AssessmentMetaForm } from './_components/assessment-meta-form'
import { normalizeRunnerConfig } from '@/utils/assessments/experience-config'

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
  external_name: string | null
  description: string | null
  key: string
  status: string
  is_public: boolean
  scoring_engine?: string | null
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

type StageCard = {
  label: string
  description: string
  href: string
  status: 'not_started' | 'in_progress' | 'ready' | 'advanced'
}

type ScoringModelSummaryRow = {
  id: string
  name: string
  mode: string | null
  status: string
}

type ReportVariantSummaryRow = {
  id: string
  name: string
  status: string
}

function stageBadge(status: StageCard['status']) {
  switch (status) {
    case 'ready':
      return {
        label: 'Ready',
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      }
    case 'in_progress':
      return {
        label: 'In progress',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      }
    case 'advanced':
      return {
        label: 'Advanced only',
        className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
      }
    default:
      return {
        label: 'Not started',
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      }
  }
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
  let questionCount = 0
  let scoringModelCount = 0
  let totalReportVariantCount = 0
  let publishedReportCount = 0
  let campaignCount = 0
  let defaultScoringModel: ScoringModelSummaryRow | null = null
  let defaultReportVariant: ReportVariantSummaryRow | null = null

  try {
    const [sRes, rcRes, pcRes, rrRes, qRes, smRes, rvtRes, rvpRes, caRes, dsmRes, drvRes] = await Promise.all([
      adminClient
        .from('assessments')
        .select('id, name, external_name, description, key, status, is_public, scoring_engine, public_url, runner_config, report_config, created_at')
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
      adminClient.from('assessment_questions').select('id', { count: 'exact', head: true }).eq('assessment_id', id).eq('is_active', true),
      adminClient.from('assessment_scoring_models').select('id', { count: 'exact', head: true }).eq('assessment_id', id),
      adminClient.from('assessment_report_variants').select('id', { count: 'exact', head: true }).eq('assessment_id', id),
      adminClient.from('assessment_report_variants').select('id', { count: 'exact', head: true }).eq('assessment_id', id).eq('status', 'published'),
      adminClient.from('campaign_assessments').select('id', { count: 'exact', head: true }).eq('assessment_id', id).eq('is_active', true),
      adminClient
        .from('assessment_scoring_models')
        .select('id, name, mode, status')
        .eq('assessment_id', id)
        .eq('is_default', true)
        .maybeSingle(),
      adminClient
        .from('assessment_report_variants')
        .select('id, name, status')
        .eq('assessment_id', id)
        .eq('is_default', true)
        .maybeSingle(),
    ])
    if (sRes.error) throw sRes.error
    assessment = sRes.data as AssessmentRow | null
    responseCount = rcRes.count
    pendingCount = pcRes.count
    recentResponses = rrRes.data as ResponseRow[] | null
    questionCount = qRes.count ?? 0
    scoringModelCount = smRes.count ?? 0
    totalReportVariantCount = rvtRes.count ?? 0
    publishedReportCount = rvpRes.count ?? 0
    campaignCount = caRes.count ?? 0
    defaultScoringModel = (dsmRes.data as ScoringModelSummaryRow | null) ?? null
    defaultReportVariant = (drvRes.data as ReportVariantSummaryRow | null) ?? null
  } catch (err) {
    return <p className="text-sm text-red-600">Failed to load assessment: {String(err)}</p>
  }

  if (!assessment) {
    return <p className="text-sm text-red-600">Assessment not found.</p>
  }

  const publicUrl = assessment.public_url
  const surveyLink = publicUrl ? `${getSiteUrl()}${publicUrl}` : null

  const createdAt = new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric' }).format(new Date(assessment.created_at))
  const psychometricsOptional = (defaultScoringModel?.mode ?? assessment.scoring_engine ?? 'rule_based') === 'rule_based'
  const stages: StageCard[] = [
    {
      label: 'Questions',
      description: questionCount > 0 ? `${questionCount} active items configured.` : 'Add questions and map them to competencies.',
      href: `/dashboard/assessments/${id}/questions`,
      status: questionCount > 0 ? 'ready' : 'not_started',
    },
    {
      label: 'Scoring',
      description:
        scoringModelCount === 0
          ? 'Create the first scoring model.'
          : defaultScoringModel?.status === 'published'
            ? `${scoringModelCount} scoring model${scoringModelCount === 1 ? '' : 's'} available.`
            : 'A default scoring model exists, but it still needs review before delivery.',
      href: `/dashboard/assessments/${id}/scoring`,
      status:
        scoringModelCount === 0
          ? 'not_started'
          : defaultScoringModel?.status === 'published'
            ? 'ready'
            : 'in_progress',
    },
    {
      label: 'Psychometrics',
      description: psychometricsOptional
        ? 'Optional for this assessment. Open it only if you are adding psychometric or hybrid scoring.'
        : 'Configure traits, mappings, validation, and norms for the active psychometric or hybrid model.',
      href: `/dashboard/assessments/${id}/psychometrics`,
      status: psychometricsOptional ? 'advanced' : 'in_progress',
    },
    {
      label: 'Reports',
      description:
        totalReportVariantCount === 0
          ? 'Create and publish at least one report variant.'
          : publishedReportCount > 0
            ? `${publishedReportCount} published report variant${publishedReportCount === 1 ? '' : 's'}.`
            : 'Variants exist, but none are published yet.',
      href: `/dashboard/assessments/${id}/report`,
      status:
        totalReportVariantCount === 0
          ? 'not_started'
          : publishedReportCount > 0
            ? 'ready'
            : 'in_progress',
    },
    {
      label: 'Campaigns',
      description: campaignCount > 0 ? `Attached to ${campaignCount} active campaign${campaignCount === 1 ? '' : 's'}.` : 'Attach this assessment to a campaign when it is ready to deliver.',
      href: `/dashboard/assessments/${id}/campaigns`,
      status: campaignCount > 0 ? 'ready' : 'not_started',
    },
  ]
  const nextStage = stages.find((stage) => stage.status === 'not_started' || stage.status === 'in_progress') ?? stages[stages.length - 1]

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
        <AssessmentMetaForm
          assessmentId={id}
          initialExternalName={assessment.external_name}
          initialDescription={assessment.description}
        />
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Builder flow</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Questions and competencies come first, then scoring models, then report variants and campaign delivery.
              </p>
            </div>
            <Link href={nextStage.href} className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              Next step →
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {stages.map((stage) => (
              <Link
                key={stage.label}
                href={stage.href}
                className="rounded-lg border border-zinc-200 p-4 transition hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{stage.label}</p>
                  <span className={[
                    'rounded-full px-2 py-1 text-[11px] font-medium',
                    stageBadge(stage.status).className,
                  ].join(' ')}>
                    {stageBadge(stage.status).label}
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{stage.description}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Current defaults</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Default scoring model</p>
                <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{defaultScoringModel?.name ?? 'Not set'}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Default report variant</p>
                <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{defaultReportVariant?.name ?? 'Not set'}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Campaign usage</p>
                <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {campaignCount > 0 ? `${campaignCount} active campaign${campaignCount === 1 ? '' : 's'}` : 'Not attached yet'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Next recommended action</h2>
            <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">{nextStage.label}</p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{nextStage.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={nextStage.href} className="inline-flex rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
                Continue builder
              </Link>
              <Link href={`/dashboard/assessments/${id}/experience`} className="inline-flex rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
                Review experience
              </Link>
            </div>
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Use Assessment Experience for participant flow. Use Psychometrics only when this assessment needs statistical scales, norms, or hybrid scoring.
            </p>
          </div>
        </div>
      </div>

      {/* Build health */}
      <AssessmentBuildHealth
        assessmentId={id}
        dataCollectionOnly={normalizeRunnerConfig(assessment.runner_config).data_collection_only}
      />

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
      <AssessmentDangerZone
        assessmentId={id}
        assessmentName={assessment.name}
        assessmentStatus={assessment.status}
        responseCount={responseCount ?? 0}
      />
    </div>
  )
}
