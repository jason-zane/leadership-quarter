import { notFound } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import { ScoringEngineSelector } from './_components/scoring-engine-selector'
import { DimensionsSection } from './_components/dimensions-section'
import { TraitsSection } from './_components/traits-section'
import { NormGroupsSection } from './_components/norm-groups-section'
import { InterpretationRulesSection } from './_components/interpretation-rules-section'

export default async function PsychometricsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: assessmentId } = await params
  const adminClient = createAdminClient()

  if (!adminClient) {
    return <p className="text-sm text-red-600">Supabase service role is not configured.</p>
  }

  const [assessmentResult, dimensionsResult, traitsResult, normGroupsResult, rulesResult, questionsResult] =
    await Promise.all([
      adminClient
        .from('assessments')
        .select('id, name, scoring_engine')
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
        .select('id, assessment_id, name, description, n, is_global, created_at, updated_at')
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
        .select('id, question_key, text, sort_order')
        .eq('assessment_id', assessmentId)
        .eq('is_active', true)
        .order('sort_order'),
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

  // Attach norm_stats to each group
  const groupIds = normGroups.map((g) => g.id)
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

  const normGroupsWithStats = normGroups.map((g) => ({
    ...g,
    norm_stats: statsByGroup.get(g.id) ?? [],
  }))

  return (
    <div className="backend-page-content space-y-8">
      <section className="backend-section">
        <h2 className="backend-section-title">Scoring engine</h2>
        <p className="backend-section-subtitle mb-4">
          Choose how scores are computed for this assessment.
        </p>
        <ScoringEngineSelector
          assessmentId={assessmentId}
          current={(assessment.scoring_engine ?? 'rule_based') as 'rule_based' | 'psychometric' | 'hybrid'}
        />
      </section>

      <section className="backend-section">
        <h2 className="backend-section-title">Dimensions</h2>
        <p className="backend-section-subtitle mb-4">
          Dimensions group traits into higher-level categories shown on reports.
        </p>
        <DimensionsSection
          assessmentId={assessmentId}
          initialDimensions={dimensions as Parameters<typeof DimensionsSection>[0]['initialDimensions']}
        />
      </section>

      <section className="backend-section">
        <h2 className="backend-section-title">Traits &amp; mappings</h2>
        <p className="backend-section-subtitle mb-4">
          Define the psychological traits measured by this assessment and map questions to each trait.
        </p>
        <TraitsSection
          assessmentId={assessmentId}
          initialTraits={traits as Parameters<typeof TraitsSection>[0]['initialTraits']}
          questions={questions}
        />
      </section>

      <section className="backend-section">
        <h2 className="backend-section-title">Norm groups</h2>
        <p className="backend-section-subtitle mb-4">
          Norm groups define the reference population used to compute percentile ranks.
          Use &quot;Compute from submissions&quot; to derive norms from existing submission data.
        </p>
        <NormGroupsSection
          assessmentId={assessmentId}
          initialNormGroups={normGroupsWithStats as Parameters<typeof NormGroupsSection>[0]['initialNormGroups']}
        />
      </section>

      <section className="backend-section">
        <h2 className="backend-section-title">Interpretation rules</h2>
        <p className="backend-section-subtitle mb-4">
          Rules determine what text is shown to participants based on their percentile scores.
        </p>
        <InterpretationRulesSection
          assessmentId={assessmentId}
          initialRules={rules as Parameters<typeof InterpretationRulesSection>[0]['initialRules']}
        />
      </section>
    </div>
  )
}
