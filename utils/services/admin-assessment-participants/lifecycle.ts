import { updateAssessmentParticipantStatus } from '@/utils/services/assessment-participants'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function updateAdminAssessmentParticipantLifecycle(input: {
  adminClient: SupabaseClient
  participantId: string
  action: 'archive' | 'restore'
}) {
  const nextStatus = input.action === 'archive' ? 'archived' : 'active'
  return updateAssessmentParticipantStatus({
    client: input.adminClient,
    participantId: input.participantId,
    status: nextStatus,
  })
}
