import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id: assessmentId } = await params

  // Total submissions
  const { count: totalSubmissions } = await auth.adminClient
    .from('assessment_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('assessment_id', assessmentId)

  // Trait score aggregates via session_scores → trait_scores
  const { data: traitRows } = await auth.adminClient
    .from('assessment_traits')
    .select('id, code, name')
    .eq('assessment_id', assessmentId)

  const traits: Array<{
    traitId: string
    code: string
    name: string
    count: number
    mean: number
    sd: number
    percentiles: { p25: number | null; p50: number | null; p75: number | null }
  }> = []

  if (traitRows && traitRows.length > 0) {
    for (const trait of traitRows) {
      // Join session_scores → assessment_submissions to filter by assessment_id
      const { data: scoreRows } = await auth.adminClient
        .from('trait_scores')
        .select('raw_score, session_scores!inner(assessment_id)')
        .eq('trait_id', trait.id)
        .eq('session_scores.assessment_id', assessmentId)

      if (!scoreRows || scoreRows.length === 0) continue

      const scores = scoreRows.map((r) => r.raw_score as number)
      const n = scores.length
      const mean = scores.reduce((a, b) => a + b, 0) / n
      const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / n
      const sd = Math.sqrt(variance)

      const sorted = [...scores].sort((a, b) => a - b)
      const p = (pct: number) => {
        const idx = Math.floor((pct / 100) * (n - 1))
        return sorted[idx] ?? null
      }

      traits.push({
        traitId: trait.id,
        code: trait.code,
        name: trait.name,
        count: n,
        mean: Math.round(mean * 100) / 100,
        sd: Math.round(sd * 100) / 100,
        percentiles: { p25: p(25), p50: p(50), p75: p(75) },
      })
    }
  }

  // Classification breakdown
  const { data: classRows } = await auth.adminClient
    .from('assessment_submissions')
    .select('classification')
    .eq('assessment_id', assessmentId)

  const classMap = new Map<string, { label: string; count: number }>()
  for (const row of classRows ?? []) {
    const cls = row.classification as { key?: string; label?: string } | null
    if (!cls?.key) continue
    const existing = classMap.get(cls.key)
    if (existing) {
      existing.count++
    } else {
      classMap.set(cls.key, { label: cls.label ?? cls.key, count: 1 })
    }
  }

  const total = totalSubmissions ?? 0
  const classificationBreakdown = Array.from(classMap.entries()).map(([key, { label, count }]) => ({
    key,
    label,
    count,
    pct: total > 0 ? Math.round((count / total) * 100) : 0,
  }))

  return NextResponse.json({
    ok: true,
    totalSubmissions: total,
    traits,
    classificationBreakdown,
  })
}
