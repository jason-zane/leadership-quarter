import { headers } from 'next/headers'
import { AssessmentRunner } from '@/components/assess/assessment-runner'
import type { RunnerConfig } from '@/utils/assessments/experience-config'
import type { AssessmentV2ExperienceConfig } from '@/utils/assessments/v2-experience-config'
import type { RuntimeAssessmentScale } from '@/utils/services/assessment-runtime-content'

type Props = {
  params: Promise<{ token: string }>
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
  invitation?: {
    firstName?: string | null
    lastName?: string | null
    organisation?: string | null
    role?: string | null
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
  v2ExperienceConfig?: AssessmentV2ExperienceConfig
  scale?: RuntimeAssessmentScale
}

function invitationMessage(errorCode: string | undefined) {
  if (errorCode === 'invitation_expired') return 'This invitation has expired.'
  if (errorCode === 'invitation_completed') return 'This invitation has already been completed.'
  return 'This invitation could not be loaded.'
}

export default async function InvitationAssessmentPage({ params, searchParams }: Props) {
  const { token } = await params
  await searchParams
  const headerStore = await headers()
  const host = headerStore.get('host')
  const proto = headerStore.get('x-forwarded-proto') || 'https'
  const baseUrl = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'

  const response = await fetch(
    `${baseUrl}/api/assessments/runtime/invitation/${encodeURIComponent(token)}`,
    { cache: 'no-store' }
  ).catch(() => null)

  const payload = (await response?.json().catch(() => null)) as RuntimePayload | null

  if (!response?.ok || !payload?.ok || !payload.assessment || !payload.questions || !payload.runnerConfig) {
    return (
      <div className="assess-container">
        <section className="assess-card">
          <p className="assess-kicker">Invitation</p>
          <h1 className="assess-title">Invitation unavailable</h1>
          <p className="assess-subtitle">{invitationMessage(payload?.error)}</p>
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
        submitEndpoint={`/api/assessments/invitation/${encodeURIComponent(token)}/submit`}
        headerContext={{
          label: 'Invited participant',
          value:
            [
              [payload.invitation?.firstName, payload.invitation?.lastName].filter(Boolean).join(' '),
              payload.invitation?.organisation,
            ]
              .filter(Boolean)
              .join(' · ') || 'Participant',
        }}
      />
    </div>
  )
}
