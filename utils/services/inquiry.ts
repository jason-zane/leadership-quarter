import { createContactEvent, upsertContactByEmail } from '@/utils/services/contacts'
import { enqueueTemplatedEmailJob } from '@/utils/services/email-jobs'
import {
  createInterestSubmission,
  createSubmissionEvent,
  linkSubmissionToContact,
} from '@/utils/services/submissions'
import { createAdminClient } from '@/utils/supabase/admin'

export type InquiryPayload = {
  name?: string
  workEmail?: string
  organisation?: string
  role?: string
  topic?: string
  message?: string
  consent?: boolean
}

function splitName(name: string) {
  const normalized = name.trim().replace(/\s+/g, ' ')
  const [firstName, ...rest] = normalized.split(' ')
  return {
    firstName: firstName || '',
    lastName: rest.join(' ') || '—',
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function submitInquiry(input: {
  payload: InquiryPayload | null
  ipAddress: string
  userAgent: string | null
}): Promise<
  | {
      ok: true
      data: {
        submissionId: string
      }
    }
  | {
      ok: false
      error: 'invalid_payload' | 'invalid_fields' | 'invalid_name' | 'missing_service_role' | string
    }
> {
  if (!input.payload) {
    return { ok: false, error: 'invalid_payload' }
  }

  const name = String(input.payload.name ?? '').trim()
  const email = String(input.payload.workEmail ?? '')
    .trim()
    .toLowerCase()
  const organisation = String(input.payload.organisation ?? '').trim()
  const role = String(input.payload.role ?? '').trim()
  const topic = String(input.payload.topic ?? '').trim()
  const message = String(input.payload.message ?? '').trim()
  const consent = input.payload.consent === true

  if (!name || !email || !organisation || !message || !consent || !isValidEmail(email)) {
    return { ok: false, error: 'invalid_fields' }
  }

  const { firstName, lastName } = splitName(name)
  if (!firstName) {
    return { ok: false, error: 'invalid_name' }
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return { ok: false, error: 'missing_service_role' }
  }

  const source = 'site:work_with_us'
  const answers = {
    first_name: firstName,
    last_name: lastName,
    email,
    organisation,
    role,
    topic,
    message,
    consent,
  }

  const submissionResult = await createInterestSubmission(adminClient, {
    firstName,
    lastName,
    email,
    source,
    formKey: 'inquiry_work_with_us_v1',
    schemaVersion: 1,
    answers,
    rawPayload: answers,
    reviewStatus: 'pending_review',
    priority: 'normal',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  })

  if (!submissionResult.data?.id || submissionResult.error) {
    return {
      ok: false,
      error: submissionResult.error ?? 'submission_failed',
    }
  }

  const submissionId = submissionResult.data.id
  await createSubmissionEvent(adminClient, {
    submissionId,
    eventType: 'inquiry_received',
    eventData: { source, topic },
  })

  const contactResult = await upsertContactByEmail(adminClient, {
    firstName,
    lastName,
    email,
    source,
  })

  if (contactResult.data?.id) {
    const contactId = contactResult.data.id
    await linkSubmissionToContact(adminClient, submissionId, contactId)
    await createContactEvent(adminClient, {
      contactId,
      eventType: 'inquiry_received',
      eventData: { submission_id: submissionId, topic, source },
    })
  }

  const variables = {
    first_name: firstName,
    last_name: lastName,
    email,
    organisation,
    role: role || '—',
    topic: topic || 'General inquiry',
    message,
    source,
  }

  await enqueueTemplatedEmailJob(adminClient, {
    to: email,
    templateKey: 'inquiry_user_confirmation',
    variables,
  })

  const internalTo = process.env.RESEND_NOTIFICATION_TO?.trim().toLowerCase()
  if (internalTo && isValidEmail(internalTo)) {
    await enqueueTemplatedEmailJob(adminClient, {
      to: internalTo,
      templateKey: 'inquiry_internal_notification',
      variables,
    })
  }

  return {
    ok: true,
    data: {
      submissionId,
    },
  }
}
