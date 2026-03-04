import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { sendSurveyInvitationEmail } from '@/utils/assessments/email'
import { getPortalBaseUrl } from '@/utils/hosts'

function getBaseUrl() {
  return getPortalBaseUrl()
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params

  const { data: invitationRow, error } = await auth.adminClient
    .from('assessment_invitations')
    .select('id, assessment_id, token, email, first_name, status, assessments(name)')
    .eq('id', id)
    .maybeSingle()

  if (error || !invitationRow) {
    return NextResponse.json({ ok: false, error: 'invitation_not_found' }, { status: 404 })
  }

  const surveyName = (invitationRow.assessments as { name?: string } | null)?.name ?? 'Assessment'

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
    .from('assessment_invitations')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', invitationRow.id)

  return NextResponse.json({ ok: true })
}
