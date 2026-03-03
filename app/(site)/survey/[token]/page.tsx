import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { AiReadinessSurveyForm } from '@/components/site/ai-readiness-survey-form'

export const metadata: Metadata = {
  title: 'Survey Invitation',
  description: 'Complete your invited survey.',
}

type Props = {
  params: Promise<{ token: string }>
}

type InvitationPayload = {
  ok?: boolean
  error?: string
  survey?: {
    id: string
    key: string
    name: string
    description: string | null
    version: number
  }
  questions?: Array<{
    id: string
    question_key: string
    text: string
    dimension: string
    is_reverse_coded: boolean
    sort_order: number
  }>
  invitation?: {
    firstName?: string | null
    lastName?: string | null
    organisation?: string | null
    role?: string | null
  }
}

function statusMessage(errorCode: string | undefined) {
  if (errorCode === 'invitation_expired') {
    return 'This invitation has expired. Please request a new invitation link.'
  }
  if (errorCode === 'invitation_completed') {
    return 'This invitation has already been completed.'
  }
  return 'This invitation is unavailable.'
}

export default async function InvitedSurveyPage({ params }: Props) {
  const { token } = await params
  const headerStore = await headers()
  const host = headerStore.get('host')
  const proto = headerStore.get('x-forwarded-proto') || 'https'
  const baseUrl = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const response = await fetch(`${baseUrl}/api/surveys/invitation/${encodeURIComponent(token)}`, {
    cache: 'no-store',
  }).catch(() => null)

  const payload = (await response?.json().catch(() => null)) as InvitationPayload | null

  if (!response?.ok || !payload?.ok) {
    return (
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-44 text-[var(--site-text-primary)] md:px-12">
        <div className="site-card-strong p-8 md:p-10">
          <p className="font-eyebrow text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
            Survey invitation
          </p>
          <h1 className="mt-3 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.12]">Invitation unavailable</h1>
          <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">{statusMessage(payload?.error)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-6 pb-24 pt-40 text-[var(--site-text-primary)] md:px-12">
      <section className="mb-8 site-card-strong p-6 md:p-8">
        <p className="font-eyebrow text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
          Invited survey
        </p>
        <h1 className="mt-3 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.08]">
          {payload.survey?.name ?? 'Survey'}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[var(--site-text-body)]">
          {payload.survey?.description || 'Your responses are tied to your private invitation.'}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 text-sm text-[var(--site-text-body)] md:grid-cols-2">
          <p>
            <span className="font-semibold text-[var(--site-text-primary)]">Name:</span>{' '}
            {[payload.invitation?.firstName, payload.invitation?.lastName].filter(Boolean).join(' ') || '-'}
          </p>
          <p>
            <span className="font-semibold text-[var(--site-text-primary)]">Organisation:</span>{' '}
            {payload.invitation?.organisation || '-'}
          </p>
          <p>
            <span className="font-semibold text-[var(--site-text-primary)]">Role:</span> {payload.invitation?.role || '-'}
          </p>
        </div>
      </section>

      <AiReadinessSurveyForm invitationToken={token} initialData={payload} />
    </div>
  )
}
