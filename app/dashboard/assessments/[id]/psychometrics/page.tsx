import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminAssessmentAnalytics } from '@/utils/services/admin-assessment-analytics'
import {
  getPsychometricMathVerification,
  mergePsychometricMathStatuses,
  type PsychometricMathCheck,
  type PsychometricMathCheckStatus,
} from '@/utils/services/psychometric-math-verification'
import { createAdminClient } from '@/utils/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'
import { CohortComparison } from '@/app/dashboard/assessments/[id]/analytics/_components/cohort-comparison'
import { ScoringEngineSelector } from './_components/scoring-engine-selector'
import { DimensionsSection } from './_components/dimensions-section'
import { TraitsSection } from './_components/traits-section'
import { NormGroupsSection } from './_components/norm-groups-section'
import { InterpretationRulesSection } from './_components/interpretation-rules-section'
import { ConstructValidationSection } from './_components/construct-validation-section'
import { StageProgress } from './_components/stage-progress'
import { SectionNav } from './_components/section-nav'
import { AssessmentHealthCard } from './_components/assessment-health-card'
import { ItemAnalysisTable } from './_components/item-analysis-table'

type ReliabilitySignal = 'green' | 'amber' | 'red' | 'insufficient_data'

const SIGNAL_BADGE: Record<ReliabilitySignal, string> = {
  green: 'signal-green',
  amber: 'signal-amber',
  red: 'signal-red',
  insufficient_data: 'signal-grey',
}

const SIGNAL_LABELS: Record<ReliabilitySignal, string> = {
  green: 'Stable',
  amber: 'Watch',
  red: 'Review now',
  insufficient_data: 'Not enough data',
}

type StageProgressProps = React.ComponentProps<typeof StageProgress>

function computeStages(input: {
  hasTraitScales: boolean
  traitCount: number
  normGroupN: number
  hasBenchmarks: boolean
  hasInterpretationRules: boolean
  totalSubmissions: number
  hasCompletedRun: boolean
  hasApprovedRun: boolean
  allScalesReliable: boolean
}): StageProgressProps['stages'] {
  const stage1Complete = input.hasTraitScales && input.traitCount >= 1
  const stage2Complete = stage1Complete && input.normGroupN >= 50 && input.hasBenchmarks
  const stage3Complete = stage1Complete && input.hasInterpretationRules
  const stage4Adequate = input.totalSubmissions >= 300
  const stage5Complete = stage1Complete && input.hasCompletedRun && input.totalSubmissions >= 100
  const stage6Complete = stage5Complete && input.hasApprovedRun && input.normGroupN >= 200 && input.allScalesReliable

  const activeStage = !stage1Complete ? 1
    : !stage2Complete ? 2
    : !stage3Complete ? 3
    : !stage4Adequate ? 4
    : !stage5Complete ? 5
    : !stage6Complete ? 6
    : 6

  return [
    { number: 1, label: 'Structure', status: stage1Complete ? 'complete' : activeStage === 1 ? 'active' : 'locked' },
    { number: 2, label: 'Reference groups', status: stage2Complete ? 'complete' : activeStage === 2 ? 'active' : 'locked' },
    { number: 3, label: 'Interpretation', status: stage3Complete ? 'complete' : activeStage === 3 ? 'active' : 'locked' },
    {
      number: 4,
      label: 'Collection',
      status: stage4Adequate ? 'complete' : activeStage <= 4 ? 'active' : 'locked',
      detail: `n = ${input.totalSubmissions}`,
    },
    { number: 5, label: 'Analysis', status: stage5Complete ? 'complete' : activeStage === 5 ? 'active' : 'locked' },
    { number: 6, label: 'Certification', status: stage6Complete ? 'complete' : activeStage === 6 ? 'active' : 'locked' },
  ]
}

function computeHealthScore(input: {
  hasTraitScales: boolean
  allScalesReliable: boolean
  normGroupN: number
  hasCriticalWarnings: boolean
  hasApprovedRun: boolean
}): number {
  let score = 0
  if (input.hasTraitScales) score += 20
  if (input.allScalesReliable) score += 20
  if (input.normGroupN >= 200) score += 20
  if (!input.hasCriticalWarnings) score += 20
  if (input.hasApprovedRun) score += 20
  return score
}

function verificationBadgeVariant(status: PsychometricMathCheckStatus): string {
  switch (status) {
    case 'pass':
      return 'signal-green'
    case 'warning':
      return 'signal-amber'
    case 'fail':
      return 'signal-red'
    default:
      return 'signal-grey'
  }
}

function verificationLabel(status: PsychometricMathCheckStatus) {
  switch (status) {
    case 'pass':
      return 'Looks good'
    case 'warning':
      return 'Needs review'
    case 'fail':
      return 'Do not trust yet'
    default:
      return 'Not ready yet'
  }
}

function verificationGuide(check: PsychometricMathCheck) {
  switch (check.code) {
    case 'score_recomputation':
      return {
        title: 'Saved scores still match the raw answers',
        what: 'We rebuild saved trait and dimension scores from the original item responses.',
        next:
          check.status === 'fail'
            ? 'Do not trust psychometric outputs until the score rows match a fresh recomputation.'
            : check.status === 'warning'
              ? 'Review whether the warning is configuration drift or a real score mismatch.'
              : 'No action is needed unless you changed mappings and want to rescore older sessions.',
      }
    case 'norm_recomputation':
      return {
        title: 'Reference-group numbers still match the saved comparison pool',
        what: 'We rebuild each saved reference group from its filters and compare the live score distribution with the stored benchmarks.',
        next:
          check.status === 'fail'
            ? 'Recompute the reference group before trusting percentiles or comparison bands.'
            : check.status === 'warning'
              ? 'Finish computing any incomplete reference groups before using them operationally.'
              : 'Your saved benchmark groups are currently in sync with the filtered score pool.',
      }
    default:
      return {
        title: 'Question quality numbers stay inside safe ranges',
        what: 'We check that scale consistency, item-to-scale fit, missingness, and keyed means stay inside sensible numeric bounds.',
        next:
          check.status === 'fail'
            ? 'Treat impossible values as a data or scoring defect that needs fixing before trust.'
            : check.status === 'warning'
              ? 'Review the affected scales because they are behaving badly even if the arithmetic still runs.'
              : 'These diagnostics are numerically sane right now.',
      }
  }
}


function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function buildReliabilityVerificationCheck(analytics: {
  dimensionReliability: Array<{
    alpha: number | null
    alphaCI95: { lower: number; upper: number } | null
    sem: number | null
  }>
  itemAnalytics: Array<{
    citc: number | null
    missingPct: number
    mean: number
  }>
}): PsychometricMathCheck {
  const invalidAlpha = analytics.dimensionReliability.filter(
    (scale) => scale.alpha !== null && (scale.alpha < -1 || scale.alpha > 1)
  )
  const invalidAlphaCi = analytics.dimensionReliability.filter(
    (scale) =>
      scale.alphaCI95 !== null &&
      (scale.alphaCI95.lower > scale.alphaCI95.upper ||
        scale.alphaCI95.lower < -1 ||
        scale.alphaCI95.upper > 1)
  )
  const invalidSem = analytics.dimensionReliability.filter(
    (scale) => scale.sem !== null && scale.sem < 0
  )
  const invalidCitc = analytics.itemAnalytics.filter(
    (item) => item.citc !== null && (item.citc < -1 || item.citc > 1)
  )
  const invalidMissing = analytics.itemAnalytics.filter(
    (item) => item.missingPct < 0 || item.missingPct > 1
  )
  const outOfRangeMeans = analytics.itemAnalytics.filter(
    (item) => Number.isFinite(item.mean) && (item.mean < 1 || item.mean > 5)
  )
  const negativeAlpha = analytics.dimensionReliability.filter(
    (scale) => scale.alpha !== null && scale.alpha < 0
  )

  const hardFailures =
    invalidAlpha.length +
    invalidAlphaCi.length +
    invalidSem.length +
    invalidCitc.length +
    invalidMissing.length +
    outOfRangeMeans.length

  if (hardFailures > 0) {
    return {
      code: 'reliability_bounds',
      title: 'Reliability bounds',
      status: 'fail',
      summary: `${hardFailures} reliability output${hardFailures === 1 ? '' : 's'} fell outside expected numeric bounds.`,
      details: [
        invalidAlpha.length > 0
          ? `${invalidAlpha.length} scale alpha value${invalidAlpha.length === 1 ? '' : 's'} fell outside the valid range.`
          : '',
        invalidAlphaCi.length > 0
          ? `${invalidAlphaCi.length} alpha confidence interval${invalidAlphaCi.length === 1 ? '' : 's'} were internally inconsistent.`
          : '',
        invalidSem.length > 0
          ? `${invalidSem.length} SEM value${invalidSem.length === 1 ? '' : 's'} were negative.`
          : '',
        invalidCitc.length > 0
          ? `${invalidCitc.length} item-total correlation${invalidCitc.length === 1 ? '' : 's'} fell outside the correlation range.`
          : '',
        invalidMissing.length > 0
          ? `${invalidMissing.length} item missing-rate value${invalidMissing.length === 1 ? '' : 's'} fell outside 0 to 1.`
          : '',
        outOfRangeMeans.length > 0
          ? `${outOfRangeMeans.length} keyed item mean${outOfRangeMeans.length === 1 ? '' : 's'} fell outside the 1 to 5 response scale.`
          : '',
      ].filter(Boolean),
    }
  }

  if (negativeAlpha.length > 0) {
    return {
      code: 'reliability_bounds',
      title: 'Reliability bounds',
      status: 'warning',
      summary: `${negativeAlpha.length} scale${negativeAlpha.length === 1 ? '' : 's'} returned a negative alpha. The arithmetic is still coherent, but the construct is behaving badly.`,
      details: [
        'Negative alpha usually points to a broken item grouping, severe reverse-scoring problems, or a scale that does not hang together empirically.',
      ],
    }
  }

  return {
    code: 'reliability_bounds',
    title: 'Reliability bounds',
    status: analytics.itemAnalytics.length === 0 && analytics.dimensionReliability.length === 0 ? 'info' : 'pass',
    summary:
      analytics.itemAnalytics.length === 0 && analytics.dimensionReliability.length === 0
        ? 'No reliability diagnostics are available yet.'
        : 'Reliability and item-diagnostic outputs are inside their expected numeric bounds.',
    details: [
      analytics.itemAnalytics.length === 0 && analytics.dimensionReliability.length === 0
        ? 'Submit data or compute psychometric analytics to activate this check.'
        : 'This check guards against impossible scale-consistency, item-fit, missing-rate, and keyed-mean values.',
    ],
  }
}

export default async function PsychometricsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ section?: string }>
}) {
  const { id: assessmentId } = await params
  const { section = 'setup' } = await searchParams
  const adminClient = createAdminClient()

  if (!adminClient) {
    return <p className="text-sm text-red-600">Supabase service role is not configured.</p>
  }

  const [
    assessmentResult,
    dimensionsResult,
    traitsResult,
    normGroupsResult,
    rulesResult,
    questionsResult,
    validationRunsResult,
    analyticsResult,
    cohortsResult,
    campaignAssessmentResult,
    mathVerification,
  ] = await Promise.all([
    adminClient
      .from('assessments')
      .select('id, name, scoring_engine, approved_analysis_run_id, validation_stage, status')
      .eq('id', assessmentId)
      .maybeSingle(),
    adminClient
      .from('assessment_dimensions')
      .select('id, assessment_id, code, name, external_name, position')
      .eq('assessment_id', assessmentId)
      .order('position'),
    adminClient
      .from('assessment_traits')
      .select(`
        id, assessment_id, dimension_id, code, name, external_name, description, score_method,
        assessment_dimensions(id, code, name, external_name, position),
        trait_question_mappings(id, trait_id, question_id, weight, reverse_scored, assessment_questions(id, question_key, text, sort_order))
      `)
      .eq('assessment_id', assessmentId)
      .order('code'),
    adminClient
      .from('norm_groups')
      .select('id, assessment_id, name, description, filters, n, is_global, created_at, updated_at')
      .eq('assessment_id', assessmentId)
      .order('created_at'),
    adminClient
      .from('interpretation_rules')
      .select('id, assessment_id, target_type, target_id, rule_type, min_percentile, max_percentile, title, body, priority, created_at')
      .eq('assessment_id', assessmentId)
      .order('priority')
      .order('min_percentile'),
    adminClient
      .from('assessment_questions')
      .select('id, question_key, text, sort_order, is_reverse_coded')
      .eq('assessment_id', assessmentId)
      .eq('is_active', true)
      .order('sort_order'),
    adminClient
      .from('psychometric_analysis_runs')
      .select('id, norm_group_id, analysis_type, status, grouping_variable, sample_n, minimum_sample_n, summary, warnings, error_message, created_at, completed_at, approved_at')
      .eq('assessment_id', assessmentId)
      .order('created_at', { ascending: false })
      .limit(10),
    getAdminAssessmentAnalytics({ adminClient, assessmentId }),
    adminClient
      .from('assessment_cohorts')
      .select('id, name, status, description, created_at')
      .eq('assessment_id', assessmentId)
      .order('created_at', { ascending: false }),
    adminClient
      .from('campaign_assessments')
      .select('campaign_id')
      .eq('assessment_id', assessmentId),
    getPsychometricMathVerification({ adminClient, assessmentId }),
  ])

  if (assessmentResult.error || !assessmentResult.data) {
    notFound()
  }

  const assessment = assessmentResult.data
  const dimensions = dimensionsResult.data ?? []
  const traits = traitsResult.data ?? []
  const questions = questionsResult.data ?? []
  const normGroups = normGroupsResult.data ?? []
  const rules = rulesResult.data ?? []
  const validationRuns =
    (validationRunsResult.data ?? []) as Parameters<typeof ConstructValidationSection>[0]['initialRuns']
  const cohorts = (cohortsResult.data ?? []).map((cohort) => ({
    id: cohort.id,
    name: cohort.name,
    status: (cohort.status as string | null) ?? null,
  }))

  const campaignIds = (campaignAssessmentResult.data ?? []).map((item) => item.campaign_id)
  let campaigns: Array<{ id: string; name: string; status: string | null }> = []
  if (campaignIds.length > 0) {
    const campaignsResult = await adminClient
      .from('campaigns')
      .select('id, name, status, created_at')
      .in('id', campaignIds)
      .order('created_at', { ascending: false })
    campaigns = (campaignsResult.data ?? []).map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      status: (campaign.status as string | null) ?? null,
    }))
  }

  let normStats: Array<{
    id: string
    norm_group_id: string
    trait_id: string
    mean: number
    sd: number
    p10: number | null
    p25: number | null
    p50: number | null
    p75: number | null
    p90: number | null
    min: number | null
    max: number | null
    computed_at: string
    assessment_traits: { code: string; name: string } | { code: string; name: string }[] | null
  }> = []

  const groupIds = normGroups.map((group) => group.id)
  if (groupIds.length > 0) {
    const { data } = await adminClient
      .from('norm_stats')
      .select('id, norm_group_id, trait_id, mean, sd, p10, p25, p50, p75, p90, min, max, computed_at, assessment_traits(code, name)')
      .in('norm_group_id', groupIds)
    normStats = (data ?? []) as typeof normStats
  }

  const statsByGroup = new Map<string, typeof normStats>()
  for (const stat of normStats) {
    const list = statsByGroup.get(stat.norm_group_id) ?? []
    list.push(stat)
    statsByGroup.set(stat.norm_group_id, list)
  }

  const normGroupsWithStats = normGroups.map((group) => ({
    ...group,
    norm_stats: statsByGroup.get(group.id) ?? [],
  }))

  const analytics =
    analyticsResult.ok
      ? analyticsResult.data
      : {
          allSubmissions: 0,
          excludedSubmissions: 0,
          totalSubmissions: 0,
          traits: [],
          classificationBreakdown: [],
          itemAnalytics: [],
          dimensionReliability: [],
          constructWarnings: [],
        }

  const latestRun = validationRuns[0] ?? null
  const approvedRun = validationRuns.find((run) => run.id === assessment.approved_analysis_run_id) ?? null
  const traitsList = (traits as Array<{ id: string; code: string; name: string }>).map((trait) => ({
    traitId: trait.id,
    code: trait.code,
    name: trait.name,
  }))
  const reliabilityVerificationCheck = buildReliabilityVerificationCheck(analytics)
  const verificationChecks = [...mathVerification.checks, reliabilityVerificationCheck]
  const overallVerificationStatus = mergePsychometricMathStatuses(
    verificationChecks.map((check) => check.status)
  )
  const verificationIssues = verificationChecks.filter(
    (check) => check.status === 'warning' || check.status === 'fail'
  ).length

  // Compute data for stage progress and health card
  const globalNormGroup = normGroups.find((g) => g.is_global) ?? normGroups[0] ?? null
  const globalNormGroupN = globalNormGroup?.n ?? 0
  const hasBenchmarks = normGroups.some((g) => (statsByGroup.get(g.id) ?? []).length > 0)
  const hasInterpretationRules = rules.length > 0
  const hasCompletedRun = validationRuns.some((r) => r.status === 'completed' || r.status === 'approved')
  const hasApprovedRun = !!approvedRun
  const allScalesReliable = analytics.dimensionReliability.length > 0 &&
    analytics.dimensionReliability.every((s) => s.alpha !== null && s.alpha >= 0.70)
  const hasCriticalWarnings = analytics.constructWarnings.length > 0
  const totalMappedItems = traits.reduce((acc, trait) => {
    const mappings = Array.isArray((trait as { trait_question_mappings?: unknown[] }).trait_question_mappings)
      ? (trait as { trait_question_mappings: unknown[] }).trait_question_mappings.length
      : 0
    return acc + mappings
  }, 0)
  const bestAlpha = analytics.dimensionReliability.reduce<number | null>((best, s) => {
    if (s.alpha === null) return best
    if (best === null) return s.alpha
    return s.alpha > best ? s.alpha : best
  }, null)

  const validationStage = (['pilot', 'analysis', 'certified', 'review'].includes(
    (assessment as { validation_stage?: string }).validation_stage ?? ''
  )
    ? (assessment as { validation_stage: string }).validation_stage
    : 'pilot') as 'pilot' | 'analysis' | 'certified' | 'review'

  const lastApprovedRunDate = approvedRun?.approved_at
    ? Math.round((Date.now() - new Date(approvedRun.approved_at).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const stages = computeStages({
    hasTraitScales: traits.length > 0,
    traitCount: traits.length,
    normGroupN: globalNormGroupN,
    hasBenchmarks,
    hasInterpretationRules,
    totalSubmissions: analytics.totalSubmissions,
    hasCompletedRun,
    hasApprovedRun,
    allScalesReliable,
  })

  const healthScore = computeHealthScore({
    hasTraitScales: traits.length > 0,
    allScalesReliable,
    normGroupN: globalNormGroupN,
    hasCriticalWarnings,
    hasApprovedRun,
  })

  return (
    <div className="space-y-6 p-6">
      {/* Stage progress */}
      <div>
        <StageProgress stages={stages} />
      </div>

      {/* Section nav */}
      <SectionNav assessmentId={assessmentId} currentSection={section} />

      {/* Health card */}
      <AssessmentHealthCard
        score={healthScore}
        validationStage={validationStage}
        itemCount={totalMappedItems}
        alpha={bestAlpha}
        referenceGroupN={globalNormGroupN}
        lastRunDaysAgo={lastApprovedRunDate}
      />

      {/* SETUP SECTION */}
      {section === 'setup' && (
        <div className="space-y-6">
          <div className="rounded-[16px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-4 py-3">
            <p className="text-sm text-[var(--admin-text-muted)]">
              This is the advanced statistical workspace. Use the Scoring tab to choose and manage scoring models; use Psychometrics only when a scoring model needs traits, reference groups, validation, or normed interpretation.
            </p>
          </div>

          <div className="psychometric-panel p-6 space-y-4">
            <h2 className="text-xl font-semibold text-[var(--admin-text)]">Scoring engine</h2>
            <p className="text-sm text-[var(--admin-text-muted)]">Set the advanced scoring mode used by the default scoring model.</p>
            <ScoringEngineSelector
              assessmentId={assessmentId}
              current={(assessment.scoring_engine ?? 'rule_based') as 'rule_based' | 'psychometric' | 'hybrid'}
            />
          </div>

          <div className="psychometric-panel p-6 space-y-4">
            <h2 className="text-xl font-semibold text-[var(--admin-text)]">Dimensions</h2>
            <p className="text-sm text-[var(--admin-text-muted)]">Set up the top-level reporting categories.</p>
            <DimensionsSection
              assessmentId={assessmentId}
              initialDimensions={dimensions as Parameters<typeof DimensionsSection>[0]['initialDimensions']}
            />
          </div>

          <div className="psychometric-panel p-6 space-y-4">
            <h2 className="text-xl font-semibold text-[var(--admin-text)]">Competencies and item mappings</h2>
            <p className="text-sm text-[var(--admin-text-muted)]">Group questions into the smaller measures you want to track.</p>
            <p className="text-sm text-[var(--admin-text-muted)] rounded-[12px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-3 py-2">
              This layer sits on top of the same question pool, but uses statistical scales and reference groups instead of the rule-based competency bands from the Questions and Scoring tabs.
            </p>
            <TraitsSection
              assessmentId={assessmentId}
              initialTraits={traits as Parameters<typeof TraitsSection>[0]['initialTraits']}
              questions={questions as Parameters<typeof TraitsSection>[0]['questions']}
              dimensions={dimensions as Parameters<typeof TraitsSection>[0]['dimensions']}
            />
          </div>

        </div>
      )}

      {/* GROUPS SECTION */}
      {section === 'groups' && (
        <div className="space-y-6">
          {globalNormGroupN < 50 && (
            <div className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-red-800">
                Sample too small for stable reliability estimates. Collect at least 50 responses before computing benchmarks.
              </p>
            </div>
          )}
          {globalNormGroupN >= 50 && globalNormGroupN < 200 && (
            <div className="rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-800">
                Provisional benchmarks. Confidence intervals will be wide. Aim for n &ge; 200 for stable estimates.
              </p>
            </div>
          )}

          <section className="space-y-4">
            <NormGroupsSection
              assessmentId={assessmentId}
              initialNormGroups={normGroupsWithStats as Parameters<typeof NormGroupsSection>[0]['initialNormGroups']}
              campaigns={campaigns}
              cohorts={cohorts}
            />
          </section>

          <div className="psychometric-panel p-6 space-y-4">
            <h2 className="text-xl font-semibold text-[var(--admin-text)]">Interpretation rules</h2>
            <p className="text-sm text-[var(--admin-text-muted)]">Control what the report says for different result ranges.</p>
            <InterpretationRulesSection
              assessmentId={assessmentId}
              initialRules={rules as Parameters<typeof InterpretationRulesSection>[0]['initialRules']}
            />
          </div>
        </div>
      )}

      {/* ANALYSIS SECTION */}
      {section === 'analysis' && (
        <div className="space-y-6">
          {/* Item analytics table */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-[var(--admin-text)]">Item analysis</h2>
            <p className="text-sm text-[var(--admin-text-muted)]">
              Use this section to find questions that are missing too often, behaving oddly, or not working well with the rest of their scale.
            </p>
            <ItemAnalysisTable
              items={analytics.itemAnalytics}
              n={analytics.dimensionReliability.length > 0
                ? Math.min(...analytics.dimensionReliability.map((d) => d.n))
                : 0}
            />
          </section>

          {/* Dimension reliability table */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-[var(--admin-text)]">Dimension reliability</h2>
            <div className="grid gap-3">
              {analytics.dimensionReliability.length === 0 ? (
                <p className="text-sm text-[var(--admin-text-muted)]">
                  Reliability will appear after enough scored submissions are available.
                </p>
              ) : (
                analytics.dimensionReliability.map((scale) => {
                  const nextStep =
                    scale.signal === 'green'
                      ? 'This competency is measuring consistently. No action needed.'
                      : scale.signal === 'amber'
                        ? 'Reliability is marginal. Check the item analysis for low-correlating items. Consider adding more items or refining existing wording.'
                        : scale.signal === 'red'
                          ? 'Reliability is below the acceptable threshold. This competency\'s score should not be used to make decisions until the issue is resolved. Review item-scale correlations for this competency.'
                          : 'Not enough data yet to compute reliability. Need at least 2 items and several respondents.'
                  return (
                    <div key={scale.scaleKey} className="rounded-[20px] border border-[var(--admin-border)] bg-white/72 px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--admin-text)]">{scale.dimension}</p>
                          <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                            {scale.source.replace('_', ' ')} &middot; {scale.itemCount} item{scale.itemCount === 1 ? '' : 's'} &middot; n={scale.n}
                            {scale.alpha !== null ? ` · α = ${scale.alpha.toFixed(2)}` : ''}
                          </p>
                        </div>
                        <Badge variant={SIGNAL_BADGE[scale.signal]}>{SIGNAL_LABELS[scale.signal]}</Badge>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[16px] bg-[var(--admin-surface-alt)] px-3 py-3">
                          <p
                            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)]"
                            title="How consistently the items in this competency measure the same thing. α ≥ 0.70 = acceptable; ≥ 0.80 = good; < 0.60 = needs review."
                          >
                            Reliability (α)
                          </p>
                          <p className="mt-1 text-lg font-semibold text-[var(--admin-text)]">
                            {scale.alpha !== null ? scale.alpha.toFixed(3) : '—'}
                          </p>
                          {scale.alphaCI95 !== null && (
                            <p
                              className="mt-0.5 text-xs text-[var(--admin-text-muted)]"
                              title="95% confidence interval for α. Wide intervals mean the estimate is noisy — collect more data before acting on it."
                            >
                              95% CI: {scale.alphaCI95.lower.toFixed(2)}–{scale.alphaCI95.upper.toFixed(2)}
                            </p>
                          )}
                        </div>
                        <div className="rounded-[16px] bg-[var(--admin-surface-alt)] px-3 py-3">
                          <p
                            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)]"
                            title="Standard Error of Measurement — how much a person's observed score is likely to vary from their true score due to measurement noise alone. Expressed in scale units (the same units as the item mean, e.g. 1–5). Rule of thumb for a 1–5 scale: < 0.3 = excellent, 0.3–0.5 = good, 0.5–0.7 = acceptable, > 0.7 = poor. Example: if SEM = 0.40 and someone scores 3.5, their true score probably falls between 3.1 and 3.9."
                          >
                            Measurement error
                          </p>
                          <p className="mt-1 text-lg font-semibold text-[var(--admin-text)]">
                            {scale.sem !== null ? scale.sem.toFixed(3) : '—'}
                          </p>
                        </div>
                        <div className="rounded-[16px] bg-[var(--admin-surface-alt)] px-3 py-3">
                          <p
                            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)]"
                            title="The ±margin around any observed score that is likely to contain the person's true score (95% of the time). Calculated as ±1.96 × SEM. A smaller number means more precise measurement. On a 1–5 scale, ±0.6 or less is good."
                          >
                            Score precision (±)
                          </p>
                          <p className="mt-1 text-lg font-semibold text-[var(--admin-text)]">
                            {scale.sem !== null ? `± ${(scale.sem * 1.96).toFixed(3)}` : '—'}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-[var(--admin-text-muted)]">{nextStep}</p>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {/* Math verification */}
          <section id="verification" className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[var(--admin-text)]">Score audit</h2>
                <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
                  These checks do not change anything. They rerun against live data so you can tell whether saved scores and comparison values still reconcile.
                </p>
              </div>
              <div className="text-sm text-[var(--admin-text-muted)]">
                Verified {formatDateTime(mathVerification.verifiedAt)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  label: 'Overall result',
                  content: <Badge variant={verificationBadgeVariant(overallVerificationStatus)}>{verificationLabel(overallVerificationStatus)}</Badge>,
                },
                { label: 'Sessions checked', value: mathVerification.metrics.sessionsChecked },
                { label: 'Reference groups checked', value: mathVerification.metrics.normGroupsChecked },
                { label: 'Checks needing review', value: verificationIssues },
              ].map((metric) => (
                <div key={metric.label} className="rounded-[20px] border border-[var(--admin-border)] bg-white/72 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)]">{metric.label}</p>
                  <div className="mt-2">
                    {metric.content ?? <p className="text-4xl font-semibold tracking-[-0.05em] text-[var(--admin-text)]">{metric.value}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {verificationChecks.map((check) => (
                <div key={check.code} className="rounded-[28px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--admin-text)]">{verificationGuide(check).title}</p>
                    <Badge variant={verificationBadgeVariant(check.status)}>{verificationLabel(check.status)}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--admin-text-muted)]">{check.summary}</p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)]">What we checked</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--admin-text-muted)]">{verificationGuide(check).what}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)]">What to do next</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--admin-text-muted)]">{verificationGuide(check).next}</p>
                    </div>
                    <details className="rounded-[18px] border border-[var(--admin-border)] bg-white/72 px-3 py-3">
                      <summary className="cursor-pointer text-sm font-semibold text-[var(--admin-text)]">
                        Advanced detail
                      </summary>
                      <div className="mt-3 space-y-2">
                        {check.details.map((detail) => (
                          <p key={detail} className="text-sm leading-6 text-[var(--admin-text-muted)]">
                            {detail}
                          </p>
                        ))}
                      </div>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Cohort comparison */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-[var(--admin-text)]">Comparative analysis</h2>
            <p className="text-sm text-[var(--admin-text-muted)]">
              Use this only when you want to compare groups. It does not change scoring; it is a read-only comparison view.
            </p>
            {analytics.totalSubmissions >= 100 ? (
              <CohortComparison assessmentId={assessmentId} cohorts={cohorts} traits={traitsList} />
            ) : (
              <div className="rounded-[24px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                <p className="text-sm text-[var(--admin-text-muted)]">
                  Cohort comparison becomes reliable at 100+ analysis responses. Current total: {analytics.totalSubmissions}.
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* CERTIFICATION SECTION */}
      {section === 'certification' && (
        <div className="space-y-6">
          {analytics.totalSubmissions < 100 && (
            <div className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-red-800">
                Insufficient data for factor analysis. Need n &ge; 100. Current total: {analytics.totalSubmissions}.
              </p>
            </div>
          )}
          {analytics.totalSubmissions >= 100 && analytics.totalSubmissions < 300 && (
            <div className="rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-800">
                Factor analysis possible but results may be unstable. Aim for n &ge; 300 for reliable structure evidence.
              </p>
            </div>
          )}

          <section className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[var(--admin-text)]">Model checks</h2>
                <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
                  Run a saved model check when you want to see whether the assessment still behaves as expected. This creates evidence for review.
                </p>
              </div>
              {approvedRun && (
                <Link
                  href={`/dashboard/assessments/${assessmentId}/psychometrics/validation/${approvedRun.id}`}
                  className="text-sm font-semibold text-[var(--admin-accent)] hover:text-[var(--admin-accent-strong)]"
                >
                  Review approved check
                </Link>
              )}
              {!approvedRun && latestRun && (
                <Link
                  href={`/dashboard/assessments/${assessmentId}/psychometrics/validation/${latestRun.id}`}
                  className="text-sm font-semibold text-[var(--admin-accent)] hover:text-[var(--admin-accent-strong)]"
                >
                  Review latest check
                </Link>
              )}
            </div>
            <ConstructValidationSection
              assessmentId={assessmentId}
              initialRuns={validationRuns}
              normGroups={normGroups.map((group) => ({ id: group.id, name: group.name }))}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-[var(--admin-text)]">Download technical summary</h2>
            <p className="text-sm text-[var(--admin-text-muted)]">
              Download a JSON summary of the psychometric properties for this assessment: structure, item statistics, reliability estimates, reference group benchmarks, and the latest approved analysis run.
            </p>
            <Link
              href={`/api/admin/assessments/${assessmentId}/psychometrics/export`}
              className="inline-flex items-center rounded-lg border border-[var(--admin-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--admin-text)] hover:bg-[var(--admin-surface-alt)] transition-colors"
            >
              Download technical summary
            </Link>
          </section>
        </div>
      )}
    </div>
  )
}
