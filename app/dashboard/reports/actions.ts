'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireAdminUser } from '@/utils/dashboard-auth'
import { assertSameOrigin } from '@/utils/security/origin'

const REPORT_BUCKET = process.env.LQ8_REPORT_BUCKET?.trim() || 'reports'
const REPORT_PATH = process.env.LQ8_REPORT_PATH?.trim() || 'lq8/lq8-framework-report.pdf'

function isPdf(file: File) {
  const contentType = file.type.toLowerCase()
  return contentType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export async function uploadLq8Report(formData: FormData) {
  try {
    assertSameOrigin()
  } catch {
    redirect('/dashboard/reports?error=invalid_origin')
  }

  const auth = await requireAdminUser()
  if (!auth.authorized) {
    redirect('/dashboard/reports?error=not_authorized')
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    redirect('/dashboard/reports?error=missing_service_role')
  }

  const reportFile = formData.get('report_file')
  if (!(reportFile instanceof File) || reportFile.size === 0) {
    redirect('/dashboard/reports?error=missing_file')
  }
  if (!isPdf(reportFile)) {
    redirect('/dashboard/reports?error=invalid_file_type')
  }

  const buffer = Buffer.from(await reportFile.arrayBuffer())
  const { error } = await adminClient.storage.from(REPORT_BUCKET).upload(REPORT_PATH, buffer, {
    contentType: 'application/pdf',
    upsert: true,
    cacheControl: '3600',
  })

  if (error) {
    const lowerMessage = error.message.toLowerCase()
    if (lowerMessage.includes('bucket')) {
      redirect('/dashboard/reports?error=bucket_missing')
    }
    redirect('/dashboard/reports?error=upload_failed')
  }

  revalidatePath('/dashboard/reports')
  redirect('/dashboard/reports?saved=uploaded')
}
