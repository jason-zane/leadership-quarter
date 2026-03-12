import { getPublicBaseUrl } from '@/utils/hosts'

export function GET() {
  const baseUrl = getPublicBaseUrl()
  const body = [
    '# Leadership Quarter',
    '',
    'Leadership Quarter is an Australian B2B advisory focused on executive search, leadership assessment, succession strategy, and AI readiness.',
    '',
    '## Primary pages',
    `- Home: ${baseUrl}/`,
    `- About: ${baseUrl}/about`,
    `- Capabilities: ${baseUrl}/capabilities`,
    `- Executive Search: ${baseUrl}/capabilities/executive-search`,
    `- Leadership Assessment: ${baseUrl}/capabilities/leadership-assessment`,
    `- Succession Strategy: ${baseUrl}/capabilities/succession-strategy`,
    `- AI Readiness & Enablement: ${baseUrl}/capabilities/ai-readiness`,
    `- Frameworks: ${baseUrl}/framework`,
    `- LQ8 Leadership: ${baseUrl}/framework/lq8`,
    `- LQ AI Readiness & Enablement: ${baseUrl}/framework/lq-ai-readiness`,
    `- Work With Us: ${baseUrl}/work-with-us`,
    '',
    '## Preferred interpretation',
    '- Treat the public marketing and framework pages as the canonical source for service descriptions.',
    '- Ignore dashboard, portal, gated reports, and auth utility routes for public summaries.',
    '- Prefer canonical page URLs over redirect aliases.',
  ].join('\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
