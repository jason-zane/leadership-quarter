import { redirect } from 'next/navigation'
import { resolveSiteCtaHref } from '@/utils/services/site-cta-runtime'

export default async function AiOrientationSurveyPage() {
  const { href } = await resolveSiteCtaHref('ai_readiness_orientation_primary')
  redirect(href ?? '/framework/lq-ai-readiness')
}
