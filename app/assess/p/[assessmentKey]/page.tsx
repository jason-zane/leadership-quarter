import { headers } from 'next/headers'
import { AssessmentRunner } from '@/components/assess/assessment-runner'
import type { RunnerConfig } from '@/utils/assessments/experience-config'
import type { AssessmentExperienceConfig } from '@/utils/assessments/assessment-experience-config'
import type { RuntimeAssessmentScale } from '@/utils/services/assessment-runtime-content'

type Props = {
  params: Promise<{ assessmentKey: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

type RuntimePayload = {
  ok?: boolean
  error?: string
  assessment?: {
    id: string
    key: string
    name: string
    description: string | null
    version?: number
  }
  questions?: Array<{
    id: string
    question_key: string
    text: string
    dimension: string
    is_reverse_coded: boolean
    sort_order: number
  }>
  runnerConfig?: RunnerConfig
  v2ExperienceConfig?: AssessmentExperienceConfig
  scale?: RuntimeAssessmentScale
}

export default async function PublicAssessmentPage({ params, searchParams }: Props) {
  const { assessmentKey } = await params
  await searchParams
  const headerStore = await headers()
  const host = headerStore.get('host')
  const proto = headerStore.get('x-forwarded-proto') || 'https'
  const baseUrl = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'

  const response = await fetch(
    `${baseUrl}/api/assessments/runtime/public/${encodeURIComponent(assessmentKey)}`,
    { cache: 'no-store' }
  ).catch(() => null)

  const payload = (await response?.json().catch(() => null)) as RuntimePayload | null

  if (!response?.ok || !payload?.ok || !payload.assessment || !payload.questions || !payload.runnerConfig) {
    return (
      <div className="assess-container">
        <section className="assess-card">
          <p className="assess-kicker">Assessment</p>
          <h1 className="assess-title">Assessment unavailable</h1>
          <p className="assess-subtitle">This assessment could not be loaded.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="assess-container">
      <AssessmentRunner
        assessment={payload.assessment}
        questions={payload.questions}
        runnerConfig={payload.runnerConfig}
        runtimeMode="v2"
        v2ExperienceConfig={payload.v2ExperienceConfig}
        scale={payload.scale}
        submitEndpoint={`/api/assessments/public/${encodeURIComponent(assessmentKey)}/submit`}
      />
    </div>
  )
}
