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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text.length > 0 ? text : null
}

const PROFILE_FIELDS = [
  ['budgetRange', 'budget_range'],
  ['retreatStylePreference', 'retreat_style_preference'],
  ['durationPreference', 'duration_preference'],
  ['travelRadius', 'travel_radius'],
  ['accommodationPreference', 'accommodation_preference'],
  ['communityVsPerformance', 'community_vs_performance'],
  ['preferredSeason', 'preferred_season'],
  ['genderOptional', 'gender_optional'],
  ['lifeStageOptional', 'life_stage_optional'],
  ['whatWouldMakeItGreat', 'what_would_make_it_great'],
] as const

export async function POST(request: Request) {
  try {
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip')?.trim() ||
      'unknown'
    const rateLimit = await checkRateLimit(`register-profile:${ipAddress}`)
    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait and try again.' },
        { status: 429 }
      )
    }

    const formData = await request.formData()
    const email = String(formData.get('email') ?? '')
      .trim()
      .toLowerCase()

    const source = cleanText(formData.get('source'))
    const retreatSlug = cleanText(formData.get('retreatSlug'))
    const retreatName = cleanText(formData.get('retreatName'))

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    const adminClient =
      supabaseUrl && supabaseServiceRoleKey
        ? createClient(supabaseUrl, supabaseServiceRoleKey)
        : null

    if (!adminClient) {
      return NextResponse.json({ ok: true })
    }

    let firstName = 'Profile'
    let lastName = 'Update'

    const { data: existingContact } = await adminClient
      .from('contacts')
      .select('id, first_name, last_name')
      .eq('email_normalized', email)
      .maybeSingle()

    if (existingContact?.first_name) firstName = existingContact.first_name
    if (existingContact?.last_name) lastName = existingContact.last_name

    const answers: Record<string, string | number | null> = {
      source,
      retreat_slug: retreatSlug,
      retreat_name: retreatName,
    }

    for (const [fieldName, answerKey] of PROFILE_FIELDS) {
      answers[answerKey] = cleanText(formData.get(fieldName))
    }

    const rawPayload: Record<string, string | number | null> = {
      email,
      source,
      retreatSlug,
      retreatName,
      ...answers,
    }

    const submissionResult = await createInterestSubmission(adminClient, {
      firstName,
      lastName,
      email,
      source,
      formKey: 'retreat_profile_optional_v1',
      schemaVersion: 1,
      answers,
      rawPayload,
      reviewStatus: 'approved',
      priority: 'normal',
      ipAddress: ipAddress === 'unknown' ? null : ipAddress,
      userAgent: request.headers.get('user-agent') ?? null,
    })

    if (submissionResult.error) {
      return NextResponse.json(
        { error: `Could not save your optional profile. ${submissionResult.error}` },
        { status: 500 }
      )
    }

    const contactResult = await upsertContactByEmail(adminClient, {
      firstName,
      lastName,
      email,
      source,
    })

    if (submissionResult.data?.id) {
      await createSubmissionEvent(adminClient, {
        submissionId: submissionResult.data.id,
        eventType: 'profile_submitted',
        eventData: {
          form_key: 'retreat_profile_optional_v1',
          retreat_slug: retreatSlug,
        },
      })

      if (contactResult.data?.id) {
        const contactId = contactResult.data.id
        await linkSubmissionToContact(adminClient, submissionResult.data.id, contactId)

        const profileSync = await syncContactProfileFromSubmission(adminClient, {
          contactId,
          formKey: 'retreat_profile_optional_v1',
          submissionId: submissionResult.data.id,
          answers,
        })

        if (profileSync.error) {
          await createSubmissionEvent(adminClient, {
            submissionId: submissionResult.data.id,
            eventType: 'profile_sync_failed',
            eventData: {
              form_key: 'retreat_profile_optional_v1',
              message: profileSync.error,
            },
          })
        } else if (profileSync.changedFields.length > 0) {
          await createSubmissionEvent(adminClient, {
            submissionId: submissionResult.data.id,
            eventType: 'contact_profile_synced',
            eventData: {
              form_key: 'retreat_profile_optional_v1',
              changed_fields: profileSync.changedFields.join(', '),
            },
          })
        }
      }
    }

    if (contactResult.data?.id) {
      await createContactEvent(adminClient, {
        contactId: contactResult.data.id,
        eventType: 'optional_profile_submitted',
        eventData: {
          source,
          retreat_slug: retreatSlug,
          form_key: 'retreat_profile_optional_v1',
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error.'
    console.error('register-profile error:', message)
    return NextResponse.json({ error: `Unexpected error: ${message}` }, { status: 500 })
  }
}
