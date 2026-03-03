import type { Metadata } from 'next'
import { TransitionLink } from '@/components/site/transition-link'
import { verifyReportAccessToken } from '@/utils/security/report-access'
import { createAdminClient } from '@/utils/supabase/admin'
import {
  getAiReadinessRecommendations,
  type AiReadinessBands,
  type AiReadinessClassification,
} from '@/utils/services/ai-readiness-scoring'

export const metadata: Metadata = {
  title: 'AI Orientation Survey Report',
  description: 'Personal AI readiness results from the AI Orientation Survey.',
}

type Props = {
  searchParams: Promise<{ access?: string }>
}

type SubmissionRow = {
  first_name: string
  last_name: string
  answers: Record<string, unknown>
}

type SurveySubmissionRow = {
  first_name: string | null
  last_name: string | null
  bands: Record<string, unknown>
  classification: Record<string, unknown>
  recommendations: unknown
}

const classifications: readonly AiReadinessClassification[] = [
  'AI-Ready Operator',
  'Naive Enthusiast',
  'Cautious Traditionalist',
  'Eager but Underdeveloped',
  'AI Resistant',
  'Developing Operator',
]

const opennessBands: readonly AiReadinessBands['openness'][] = [
  'Early Adopter',
  'Conditional Adopter',
  'Resistant / Hesitant',
]

const riskBands: readonly AiReadinessBands['riskPosture'][] = [
  'Calibrated & Risk-Aware',
  'Moderate Awareness',
  'Blind Trust or Low Risk Sensitivity',
]

const capabilityBands: readonly AiReadinessBands['capability'][] = [
  'Confident & Skilled',
  'Developing',
  'Low Confidence',
]

function AccessDenied() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-44 text-[var(--site-text-primary)] md:px-12">
      <div className="site-card-strong p-8 md:p-10">
        <p className="font-eyebrow text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
          Report access
        </p>
        <h1 className="mt-3 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.12]">This report link has expired.</h1>
        <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
          Run the orientation survey again to generate a fresh report link.
        </p>
        <TransitionLink
          href="/framework/lq-ai-readiness/orientation-survey"
          className="font-cta mt-6 inline-block rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)]"
        >
          Return to survey
        </TransitionLink>
      </div>
    </div>
  )
}

function ReportUnavailable() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-44 text-[var(--site-text-primary)] md:px-12">
      <div className="site-card-strong p-8 md:p-10">
        <p className="font-eyebrow text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
          Report unavailable
        </p>
        <h1 className="mt-3 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.12]">We could not load this result.</h1>
        <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
          Some required survey details are missing. Please complete the survey again.
        </p>
        <TransitionLink
          href="/framework/lq-ai-readiness/orientation-survey"
          className="font-cta mt-6 inline-block rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)]"
        >
          Start survey again
        </TransitionLink>
      </div>
    </div>
  )
}

function toClassification(input: unknown): AiReadinessClassification | null {
  if (typeof input !== 'string') return null
  return classifications.find((item) => item === input) ?? null
}

function toOpennessBand(input: unknown): AiReadinessBands['openness'] | null {
  if (typeof input !== 'string') return null
  if (input === 'Experimenter / Early Adopter') return 'Early Adopter'
  return opennessBands.find((item) => item === input) ?? null
}

function toRiskBand(input: unknown): AiReadinessBands['riskPosture'] | null {
  if (typeof input !== 'string') return null
  return riskBands.find((item) => item === input) ?? null
}

function toCapabilityBand(input: unknown): AiReadinessBands['capability'] | null {
  if (typeof input !== 'string') return null
  if (input === 'Low Confidence / Skill Gap') return 'Low Confidence'
  return capabilityBands.find((item) => item === input) ?? null
}

function getAxisCommentary(axis: 'curiosity' | 'judgement' | 'skill', band: string) {
  if (axis === 'curiosity') {
    if (band === 'Early Adopter') {
      return 'You show strong motivation to engage with AI and are likely to adopt new approaches quickly.'
    }
    if (band === 'Conditional Adopter') {
      return 'You are open to AI when the context is clear and the value is evident.'
    }
    return 'You currently prefer familiar methods, which may limit early AI adoption momentum.'
  }

  if (axis === 'judgement') {
    if (band === 'Calibrated & Risk-Aware') {
      return 'You demonstrate healthy judgement by balancing opportunity with quality, ethics, and risk awareness.'
    }
    if (band === 'Moderate Awareness') {
      return 'You show baseline caution, with room to strengthen consistency in risk and verification practices.'
    }
    return 'Risk sensitivity appears low, which can increase exposure to over-trust and avoidable errors.'
  }

  if (band === 'Confident & Skilled') {
    return 'You perceive strong capability and can likely translate AI use into meaningful outcomes.'
  }
  if (band === 'Developing') {
    return 'You are building capability and would benefit from focused practice in core AI workflows.'
  }
  return 'You may be underconfident or underprepared, indicating a need for structured skill development.'
}

function getProfileNarrative(classification: AiReadinessClassification) {
  if (classification === 'AI-Ready Operator') {
    return 'Your profile indicates strong readiness across curiosity, judgement, and skill. You are well positioned to contribute as an early internal champion.'
  }
  if (classification === 'Naive Enthusiast') {
    return 'You appear enthusiastic about AI, but risk calibration needs strengthening. The priority is disciplined verification and governance habits.'
  }
  if (classification === 'Cautious Traditionalist') {
    return 'You demonstrate sound judgement but lower adoption momentum. Safe experimentation can help convert caution into practical progress.'
  }
  if (classification === 'Eager but Underdeveloped') {
    return 'Your intent to adopt is clear, while execution capability needs support. Practical skill-building should be the immediate focus.'
  }
  if (classification === 'AI Resistant') {
    return 'Your current profile suggests low adoption energy and skill confidence. Start with relevance, small wins, and guided support.'
  }
  return 'Your profile is in a developing middle zone. Continued practice and targeted support can lift all three readiness axes.'
}

export default async function AiOrientationSurveyReportPage({ searchParams }: Props) {
  const { access } = await searchParams
  const accessPayload = access ? verifyReportAccessToken(access, 'ai_survey') : null

  if (!accessPayload) {
    return <AccessDenied />
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return <ReportUnavailable />
  }

  const { data, error } = await adminClient
    .from('interest_submissions')
    .select('first_name, last_name, answers')
    .eq('id', accessPayload.submissionId)
    .maybeSingle()

  let firstName = ''
  let lastName = ''
  let classification: AiReadinessClassification | null = null
  let opennessBand: AiReadinessBands['openness'] | null = null
  let riskBand: AiReadinessBands['riskPosture'] | null = null
  let capabilityBand: AiReadinessBands['capability'] | null = null
  let customRecommendations: string[] | null = null

  if (!error && data) {
    const submission = data as SubmissionRow
    firstName = submission.first_name
    lastName = submission.last_name
    classification = toClassification(submission.answers?.classification)
    opennessBand = toOpennessBand(submission.answers?.openness_band)
    riskBand = toRiskBand(submission.answers?.risk_posture_band)
    capabilityBand = toCapabilityBand(submission.answers?.capability_band)
  } else {
    const { data: surveyData, error: surveyError } = await adminClient
      .from('survey_submissions')
      .select('first_name, last_name, bands, classification, recommendations')
      .eq('id', accessPayload.submissionId)
      .maybeSingle()

    if (surveyError || !surveyData) {
      return <ReportUnavailable />
    }

    const submission = surveyData as SurveySubmissionRow
    firstName = submission.first_name ?? ''
    lastName = submission.last_name ?? ''
    classification = toClassification(submission.classification?.label)
    opennessBand = toOpennessBand(submission.bands?.openness)
    riskBand = toRiskBand(submission.bands?.riskPosture)
    capabilityBand = toCapabilityBand(submission.bands?.capability)
    if (Array.isArray(submission.recommendations)) {
      customRecommendations = submission.recommendations.filter(
        (item): item is string => typeof item === 'string'
      )
    }
  }

  if (!classification || !opennessBand || !riskBand || !capabilityBand) {
    return <ReportUnavailable />
  }

  const recommendations =
    customRecommendations && customRecommendations.length > 0
      ? customRecommendations
      : getAiReadinessRecommendations(classification)

  return (
    <div className="mx-auto max-w-5xl px-6 pb-24 pt-44 text-[var(--site-text-primary)] md:px-12">
      <article>
        <p className="font-eyebrow text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
          AI Orientation Survey Report
        </p>
        <h1 className="mt-3 font-serif text-[clamp(2.3rem,5.2vw,4.2rem)] leading-[1.02]">
          {firstName} {lastName}
        </h1>
        <section className="site-card-strong mt-8 p-6 md:p-8">
          <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
            Primary profile
          </p>
          <h2 className="mt-3 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.05] text-[var(--site-accent-strong)]">
            {classification}
          </h2>
          <p className="mt-4 max-w-4xl leading-relaxed text-[var(--site-text-body)]">
            {getProfileNarrative(classification)}
          </p>
        </section>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="site-card-primary p-5">
            <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
              Curiosity
            </p>
            <p className="mt-3 font-serif text-2xl leading-[1.12] text-[var(--site-text-primary)]">
              {opennessBand}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">
              {getAxisCommentary('curiosity', opennessBand)}
            </p>
          </div>

          <div className="site-card-tint p-5">
            <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
              Judgement
            </p>
            <p className="mt-3 font-serif text-2xl leading-[1.12] text-[var(--site-text-primary)]">
              {riskBand}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">
              {getAxisCommentary('judgement', riskBand)}
            </p>
          </div>

          <div className="site-card-primary p-5">
            <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
              Skill
            </p>
            <p className="mt-3 font-serif text-2xl leading-[1.12] text-[var(--site-text-primary)]">
              {capabilityBand}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">
              {getAxisCommentary('skill', capabilityBand)}
            </p>
          </div>
        </div>

        <section className="mt-8 site-card-strong p-6 md:p-7">
          <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
            Recommended focus
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-[var(--site-text-body)]">
            {recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-8 site-card-sub p-6 md:p-7">
          <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
            Next steps
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--site-text-body)]">
            If you want to translate this profile into practical team action, we can help you map priorities and design targeted readiness interventions.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <TransitionLink
              href="/work-with-us#inquiry-form"
              className="font-cta rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)]"
            >
              Dive deeper on AI readiness
            </TransitionLink>
            <TransitionLink
              href="/framework/lq-ai-readiness"
              className="font-cta rounded-[var(--radius-pill)] border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-text-primary)]"
            >
              Back to framework
            </TransitionLink>
          </div>
        </section>
      </article>
    </div>
  )
}
