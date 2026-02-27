'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireDashboardUser } from '@/utils/dashboard-auth'
import { upsertContactByEmail, createContactEvent } from '@/utils/services/contacts'
import { createSubmissionEvent, linkSubmissionToContact } from '@/utils/services/submissions'
import { assertSameOrigin } from '@/utils/security/origin'

type ReviewDecision = 'approved' | 'rejected'

function getRedirectTarget(formData: FormData) {
  const fallback = '/dashboard/submissions'
  const next = String(formData.get('redirect_to') ?? '').trim()
  if (!next.startsWith('/dashboard')) return fallback
  return next
}

function getContactFieldKey(reviewFieldKey: string) {
  const mapping: Record<string, string> = {
    weekly_distance_km: 'weekly_distance_km',
    long_run_km: 'long_run_km',
    pace_group: 'pace_group',
    dietary_requirements: 'dietary_requirements',
    injury_notes: 'injury_notes',
    retreat_goals: 'retreat_goals',
    preferred_retreat_timing: 'preferred_retreat_timing',
    city: 'location_city',
    phone: 'phone',
  }
  return mapping[reviewFieldKey] ?? null
}

async function ensureDashboardUser() {
  try {
    assertSameOrigin()
  } catch {
    redirect('/dashboard?error=invalid_origin')
  }
  const auth = await requireDashboardUser()
  if (!auth.authorized) {
    redirect('/dashboard')
  }
  return auth
}

async function updateSubmissionReviewStatus(submissionId: string, redirectTo: string) {
  const adminClient = createAdminClient()
  if (!adminClient) {
    redirect(`${redirectTo}?error=missing_service_role`)
  }

  const { data: reviews, error: reviewsError } = await adminClient
    .from('submission_field_reviews')
    .select('decision')
    .eq('submission_id', submissionId)

  if (reviewsError) {
    redirect(`${redirectTo}?error=review_status_failed`)
  }

  const hasPending = ((reviews ?? []) as Array<{ decision: string }>).some(
    (review) => review.decision === 'pending'
  )

  const status = hasPending ? 'pending_review' : 'approved'
  await adminClient
    .from('interest_submissions')
    .update({ review_status: status, reviewed_at: hasPending ? null : new Date().toISOString() })
    .eq('id', submissionId)
}

export async function linkSubmissionContact(formData: FormData) {
  await ensureDashboardUser()

  const submissionId = String(formData.get('submission_id') ?? '').trim()
  const firstName = String(formData.get('first_name') ?? '').trim()
  const lastName = String(formData.get('last_name') ?? '').trim()
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const sourceRaw = String(formData.get('source') ?? '').trim()
  const source = sourceRaw || null
  const redirectTo = getRedirectTarget(formData)

  if (!submissionId || !firstName || !lastName || !email) {
    redirect(`${redirectTo}?error=invalid_submission`)
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    redirect(`${redirectTo}?error=missing_service_role`)
  }

  const contactResult = await upsertContactByEmail(adminClient, {
    firstName,
    lastName,
    email,
    source,
  })

  if (!contactResult.data?.id || contactResult.error) {
    redirect(`${redirectTo}?error=contact_upsert_failed`)
  }

  const contactId = contactResult.data.id
  const { error: linkError } = await linkSubmissionToContact(adminClient, submissionId, contactId)
  if (linkError) {
    redirect(`${redirectTo}?error=contact_link_failed`)
  }

  await createSubmissionEvent(adminClient, {
    submissionId,
    eventType: 'contact_linked',
    eventData: { contact_id: contactId },
  })

  await createContactEvent(adminClient, {
    contactId,
    eventType: 'submission_linked',
    eventData: {
      submission_id: submissionId,
      source,
    },
  })

  revalidatePath('/dashboard/submissions')
  revalidatePath(`/dashboard/submissions/${submissionId}`)
  revalidatePath('/dashboard/contacts')
  revalidatePath(`/dashboard/contacts/${contactId}`)
  redirect(`${redirectTo}?saved=linked`)
}

export async function updateSubmissionStatus(formData: FormData) {
  const auth = await ensureDashboardUser()

  const submissionId = String(formData.get('submission_id') ?? '').trim()
  const nextStatus = String(formData.get('status') ?? '').trim()
  const contactIdRaw = String(formData.get('contact_id') ?? '').trim()
  const contactId = contactIdRaw || null
  const redirectTo = getRedirectTarget(formData)

  if (!submissionId || !nextStatus) {
    redirect(`${redirectTo}?error=invalid_status_update`)
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    redirect(`${redirectTo}?error=missing_service_role`)
  }

  const { error } = await adminClient
    .from('interest_submissions')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', submissionId)

  if (error) {
    redirect(`${redirectTo}?error=submission_status_failed`)
  }

  await createSubmissionEvent(adminClient, {
    submissionId,
    eventType: 'status_changed',
    eventData: { status: nextStatus },
    actorUserId: auth.user.id,
  })

  if (contactId) {
    await createContactEvent(adminClient, {
      contactId,
      eventType: 'submission_status_changed',
      eventData: {
        submission_id: submissionId,
        status: nextStatus,
      },
      actorUserId: auth.user.id,
    })
    revalidatePath(`/dashboard/contacts/${contactId}`)
  }

  revalidatePath('/dashboard/submissions')
  revalidatePath(`/dashboard/submissions/${submissionId}`)
  redirect(`${redirectTo}?saved=status`)
}

export async function assignSubmissionOwner(formData: FormData) {
  const auth = await ensureDashboardUser()

  const submissionId = String(formData.get('submission_id') ?? '').trim()
  const ownerUserIdRaw = String(formData.get('owner_user_id') ?? '').trim()
  const ownerUserId = ownerUserIdRaw.length > 0 ? ownerUserIdRaw : null
  const redirectTo = getRedirectTarget(formData)

  if (!submissionId) {
    redirect(`${redirectTo}?error=invalid_submission`)
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    redirect(`${redirectTo}?error=missing_service_role`)
  }

  const { error } = await adminClient
    .from('interest_submissions')
    .update({ owner_user_id: ownerUserId, assigned_user_id: ownerUserId, updated_at: new Date().toISOString() })
    .eq('id', submissionId)

  if (error) {
    redirect(`${redirectTo}?error=owner_update_failed`)
  }

  await createSubmissionEvent(adminClient, {
    submissionId,
    eventType: 'owner_assigned',
    eventData: { owner_user_id: ownerUserId },
    actorUserId: auth.user.id,
  })

  revalidatePath('/dashboard/submissions')
  revalidatePath(`/dashboard/submissions/${submissionId}`)
  redirect(`${redirectTo}?saved=owner`)
}

export async function setSubmissionPriority(formData: FormData) {
  const auth = await ensureDashboardUser()

  const submissionId = String(formData.get('submission_id') ?? '').trim()
  const priority = String(formData.get('priority') ?? 'normal').trim().toLowerCase()
  const redirectTo = getRedirectTarget(formData)

  if (!submissionId || !['low', 'normal', 'high'].includes(priority)) {
    redirect(`${redirectTo}?error=priority_update_failed`)
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    redirect(`${redirectTo}?error=missing_service_role`)
  }

  const { error } = await adminClient
    .from('interest_submissions')
    .update({ priority, updated_at: new Date().toISOString() })
    .eq('id', submissionId)

  if (error) {
    redirect(`${redirectTo}?error=priority_update_failed`)
  }

  await createSubmissionEvent(adminClient, {
    submissionId,
    eventType: 'priority_changed',
    eventData: { priority },
    actorUserId: auth.user.id,
  })

  revalidatePath('/dashboard/submissions')
  revalidatePath(`/dashboard/submissions/${submissionId}`)
  redirect(`${redirectTo}?saved=priority`)
}

export async function markSubmissionFirstResponse(formData: FormData) {
  const auth = await ensureDashboardUser()

  const submissionId = String(formData.get('submission_id') ?? '').trim()
  const redirectTo = getRedirectTarget(formData)

  if (!submissionId) {
    redirect(`${redirectTo}?error=invalid_submission`)
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    redirect(`${redirectTo}?error=missing_service_role`)
  }

  const firstResponseAt = new Date().toISOString()
  const { error } = await adminClient
    .from('interest_submissions')
    .update({ first_response_at: firstResponseAt, updated_at: firstResponseAt })
    .eq('id', submissionId)

  if (error) {
    redirect(`${redirectTo}?error=first_response_failed`)
  }

  await createSubmissionEvent(adminClient, {
    submissionId,
    eventType: 'first_response_recorded',
    eventData: { first_response_at: firstResponseAt },
    actorUserId: auth.user.id,
  })

  revalidatePath('/dashboard/submissions')
  revalidatePath(`/dashboard/submissions/${submissionId}`)
  redirect(`${redirectTo}?saved=first_response`)
}

async function decideSubmissionFieldReview(formData: FormData, decision: ReviewDecision) {
  const auth = await ensureDashboardUser()

  const reviewId = String(formData.get('review_id') ?? '').trim()
  const submissionId = String(formData.get('submission_id') ?? '').trim()
  const note = String(formData.get('note') ?? '').trim()
  const redirectTo = getRedirectTarget(formData)

  if (!reviewId || !submissionId) {
    redirect(`${redirectTo}?error=review_update_failed`)
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    redirect(`${redirectTo}?error=missing_service_role`)
  }

  const decidedAt = new Date().toISOString()
  const { data: reviewData, error: reviewLoadError } = await adminClient
    .from('submission_field_reviews')
    .select('id, submission_id, field_key, proposed_value, existing_value')
    .eq('id', reviewId)
    .eq('submission_id', submissionId)
    .maybeSingle()

  if (reviewLoadError || !reviewData) {
    redirect(`${redirectTo}?error=review_update_failed`)
  }

  const review = reviewData as {
    id: string
    field_key: string
    proposed_value: unknown
  }

  const { error: reviewError } = await adminClient
    .from('submission_field_reviews')
    .update({
      decision,
      decided_by_user_id: auth.user.id,
      decided_at: decidedAt,
      note: note || null,
      updated_at: decidedAt,
    })
    .eq('id', reviewId)

  if (reviewError) {
    redirect(`${redirectTo}?error=review_update_failed`)
  }

  const { data: submissionData } = await adminClient
    .from('interest_submissions')
    .select('contact_id')
    .eq('id', submissionId)
    .maybeSingle()

  const contactId = (submissionData as { contact_id?: string | null } | null)?.contact_id ?? null

  if (decision === 'approved' && contactId) {
    const contactField = getContactFieldKey(review.field_key)
    if (contactField) {
      await adminClient
        .from('contacts')
        .update({
          [contactField]: review.proposed_value,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contactId)

      await createContactEvent(adminClient, {
        contactId,
        eventType: 'submission_review_applied',
        eventData: {
          submission_id: submissionId,
          field_key: review.field_key,
          decision,
        },
        actorUserId: auth.user.id,
      })
    }
  }

  await createSubmissionEvent(adminClient, {
    submissionId,
    eventType: 'field_review_decided',
    eventData: {
      review_id: review.id,
      field_key: review.field_key,
      decision,
    },
    actorUserId: auth.user.id,
  })

  await updateSubmissionReviewStatus(submissionId, redirectTo)

  revalidatePath('/dashboard/submissions')
  revalidatePath(`/dashboard/submissions/${submissionId}`)
  if (contactId) {
    revalidatePath(`/dashboard/contacts/${contactId}`)
  }

  redirect(`${redirectTo}?saved=review`)
}

export async function approveSubmissionFieldReview(formData: FormData) {
  await decideSubmissionFieldReview(formData, 'approved')
}

export async function rejectSubmissionFieldReview(formData: FormData) {
  await decideSubmissionFieldReview(formData, 'rejected')
}
