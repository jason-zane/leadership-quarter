import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  createInterestSubmission,
  createSubmissionEvent,
  linkSubmissionToContact,
} from '@/utils/services/submissions'
import { createContactEvent, upsertContactByEmail } from '@/utils/services/contacts'
import { syncContactProfileFromSubmission } from '@/utils/services/contact-profile-sync'
import { checkRateLimit } from '@/utils/security/ratelimit'

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL
const notificationTo = process.env.RESEND_NOTIFICATION_TO
const replyTo = process.env.RESEND_REPLY_TO

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const ALLOWED_FORM_KEYS = new Set(['retreat_registration_v1', 'general_registration_v1', 'register_interest'])

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text.length > 0 ? text : null
}

function parseCheckbox(value: FormDataEntryValue | null) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'on' || normalized === 'yes'
}

function parseFormKey(value: string | null) {
  if (!value) return 'register_interest'
  return ALLOWED_FORM_KEYS.has(value) ? value : 'register_interest'
}

export async function POST(request: Request) {
  try {
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip')?.trim() ||
      'unknown'
    const rateLimit = await checkRateLimit(`register-interest:${ipAddress}`)
    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait and try again.' },
        { status: 429 }
      )
    }

    if (!resendApiKey) {
      return NextResponse.json({ error: 'Email service is not configured.' }, { status: 500 })
    }
    if (!fromEmail || !notificationTo) {
      return NextResponse.json(
        { error: 'Email sender/recipient is not configured.' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const firstName = cleanText(formData.get('firstName'))
    const lastName = cleanText(formData.get('lastName'))
    const email = String(formData.get('email') ?? '')
      .trim()
      .toLowerCase()

    const source = cleanText(formData.get('source'))
    const formKey = parseFormKey(cleanText(formData.get('formKey')))
    const retreatSlug = cleanText(formData.get('retreatSlug'))
    const retreatName = cleanText(formData.get('retreatName'))

    const ageRange = cleanText(formData.get('ageRange'))
    const gender = cleanText(formData.get('gender'))
    const genderSelfDescribe = cleanText(formData.get('genderSelfDescribe'))
    const runnerType = cleanText(formData.get('runnerType'))
    const locationLabel = cleanText(formData.get('locationLabel')) ?? cleanText(formData.get('city'))
    const marketingOptIn = parseCheckbox(formData.get('marketingOptIn'))
    const acceptedTerms = parseCheckbox(formData.get('acceptedTerms'))
    const acceptedTermsVersion = acceptedTerms ? '2026-02-terms-v1' : null
    const acceptedTermsAt = acceptedTerms ? new Date().toISOString() : null

    const legacyNotes = cleanText(formData.get('notes'))

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    if (formKey !== 'register_interest') {
      if (!ageRange || !gender || !runnerType || !locationLabel) {
        return NextResponse.json(
          { error: 'Please complete age range, gender, runner type, and location.' },
          { status: 400 }
        )
      }

      if (gender === 'Self-describe' && !genderSelfDescribe) {
        return NextResponse.json({ error: 'Please add your gender description.' }, { status: 400 })
      }

      if (formKey === 'retreat_registration_v1' && !retreatSlug) {
        return NextResponse.json({ error: 'Retreat context is required for this form.' }, { status: 400 })
      }

      if (formKey === 'retreat_registration_v1' && !acceptedTerms) {
        return NextResponse.json(
          { error: 'Please accept the terms and conditions to apply.' },
          { status: 400 }
        )
      }
    }

    const answers = {
      age_range: ageRange,
      gender,
      gender_self_describe: genderSelfDescribe,
      runner_type: runnerType,
      location_label: locationLabel,
      retreat_slug: retreatSlug,
      retreat_name: retreatName,
      source,
      marketing_opt_in: marketingOptIn,
      accepted_terms: formKey === 'retreat_registration_v1' ? acceptedTerms : null,
      accepted_terms_version: formKey === 'retreat_registration_v1' ? acceptedTermsVersion : null,
      accepted_terms_at: formKey === 'retreat_registration_v1' ? acceptedTermsAt : null,
    }

    const rawPayload: Record<string, string | number | boolean | null> = {
      firstName,
      lastName,
      email,
      source,
      formKey,
      ageRange,
      gender,
      genderSelfDescribe,
      runnerType,
      locationLabel,
      retreatSlug,
      retreatName,
      notes: legacyNotes,
      marketingOptIn,
      acceptedTerms: formKey === 'retreat_registration_v1' ? acceptedTerms : null,
      acceptedTermsVersion: formKey === 'retreat_registration_v1' ? acceptedTermsVersion : null,
      acceptedTermsAt: formKey === 'retreat_registration_v1' ? acceptedTermsAt : null,
    }

    const adminClient =
      supabaseUrl && supabaseServiceRoleKey
        ? createClient(supabaseUrl, supabaseServiceRoleKey)
        : null

    let submissionId: string | null = null

    if (adminClient) {
      const submissionResult = await createInterestSubmission(adminClient, {
        firstName,
        lastName,
        email,
        source,
        formKey,
        schemaVersion: 1,
        answers,
        rawPayload,
        reviewStatus: 'approved',
        priority: 'normal',
        ipAddress: ipAddress === 'unknown' ? null : ipAddress,
        userAgent: request.headers.get('user-agent') ?? null,
      })

      if (submissionResult.error) {
        if (submissionResult.missingTable) {
          return NextResponse.json(
            {
              error:
                'Database table is missing. Run the latest Supabase migrations with npm run db:push.',
            },
            { status: 500 }
          )
        }

        return NextResponse.json(
          { error: `Could not save your registration. ${submissionResult.error}` },
          { status: 500 }
        )
      }

      if (submissionResult.data?.id) {
        submissionId = submissionResult.data.id

        await createSubmissionEvent(adminClient, {
          submissionId,
          eventType: 'submitted',
          eventData: {
            form_key: formKey,
            page_flow: formKey === 'retreat_registration_v1' ? 'retreat' : 'general',
          },
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
            eventType: 'submission',
            eventData: {
              submission_id: submissionId,
              source,
              form_key: formKey,
            },
          })

          const profileSync = await syncContactProfileFromSubmission(adminClient, {
            contactId,
            formKey,
            submissionId,
            answers,
          })

          if (profileSync.error) {
            await createSubmissionEvent(adminClient, {
              submissionId,
              eventType: 'profile_sync_failed',
              eventData: { form_key: formKey, message: profileSync.error },
            })
          } else if (profileSync.changedFields.length > 0) {
            await createSubmissionEvent(adminClient, {
              submissionId,
              eventType: 'contact_profile_synced',
              eventData: {
                form_key: formKey,
                changed_fields: profileSync.changedFields.join(', '),
              },
            })
          }
        } else if (contactResult.error) {
          console.error('contact upsert failed:', contactResult.error)
        }
      }
    }

    const sourceLabel = source ?? 'Not provided'
    const summaryLines = [
      formKey ? `Form type: ${formKey}` : null,
      retreatName ? `Retreat: ${retreatName}` : null,
      retreatSlug ? `Retreat slug: ${retreatSlug}` : null,
      ageRange ? `Age range: ${ageRange}` : null,
      gender ? `Gender: ${gender}` : null,
      genderSelfDescribe ? `Gender self description: ${genderSelfDescribe}` : null,
      runnerType ? `Runner type: ${runnerType}` : null,
      locationLabel ? `Location: ${locationLabel}` : null,
      `Marketing opt-in: ${marketingOptIn ? 'Yes' : 'No'}`,
      formKey === 'retreat_registration_v1' ? `Terms accepted: ${acceptedTerms ? 'Yes' : 'No'}` : null,
      legacyNotes ? `Notes: ${legacyNotes}` : null,
    ].filter(Boolean)

    const notesHtml = summaryLines.length
      ? `<p><strong>Additional details:</strong></p><pre style="white-space:pre-wrap;font-size:13px">${summaryLines
          .join('\n')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</pre>`
      : ''

    const templateVars = {
      first_name: firstName,
      last_name: lastName,
      email,
      source: sourceLabel,
      notes: notesHtml,
    }

    let emailQueued = false

    if (adminClient) {
      const { error: enqueueError } = await adminClient.from('email_jobs').insert([
        {
          job_type: 'register_interest_internal',
          payload: {
            to: notificationTo,
            reply_to: replyTo ?? email,
            template_vars: templateVars,
            template_kind: 'interest_internal',
          },
        },
        {
          job_type: 'register_interest_user',
          payload: {
            to: email,
            reply_to: replyTo ?? notificationTo,
            template_vars: templateVars,
            template_kind: 'interest_user',
          },
        },
      ])

      if (enqueueError) {
        console.error('email queue insert failed:', enqueueError.message)
      } else {
        emailQueued = true
      }
    }

    return NextResponse.json({ ok: true, submissionId, next: 'optional_profile', emailQueued })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error.'
    console.error('register-interest error:', message)
    return NextResponse.json({ error: `Unexpected error: ${message}` }, { status: 500 })
  }
}
