import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/surveys/api-auth'
import { sendSurveyInvitationEmail } from '@/utils/surveys/email'

function getBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (appUrl) return appUrl.replace(/\/$/, '')
  return 'http://localhost:3000'
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params

  const { data: invitationRow, error } = await auth.adminClient
    .from('survey_invitations')
    .select('id, survey_id, token, email, first_name, status, surveys(name)')
    .eq('id', id)
    .maybeSingle()

  if (error || !invitationRow) {
    return NextResponse.json({ ok: false, error: 'invitation_not_found' }, { status: 404 })
  }

  const surveyName = (invitationRow.surveys as { name?: string } | null)?.name ?? 'Survey'

  const sendResult = await sendSurveyInvitationEmail({
    to: invitationRow.email,
    firstName: invitationRow.first_name,
    surveyName,
    invitationUrl: `${getBaseUrl()}/survey/${invitationRow.token}`,
  })

  if (!sendResult.ok) {
    return NextResponse.json({ ok: false, error: 'send_failed', message: sendResult.error }, { status: 500 })
  }

  await auth.adminClient
    .from('survey_invitations')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', invitationRow.id)

  return NextResponse.json({ ok: true })
}
