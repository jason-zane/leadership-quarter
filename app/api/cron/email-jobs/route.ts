import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { runPendingEmailJobs } from '@/utils/services/cron-email-jobs'

export const maxDuration = 60

function getCronSecret() {
  return process.env.CRON_SECRET?.trim() || null
}

function getTokenFromRequest(request: Request) {
  const header = request.headers.get('authorization') || request.headers.get('x-cron-secret')
  if (!header) return null
  if (header.startsWith('Bearer ')) return header.slice('Bearer '.length).trim()
  return header.trim()
}

export async function GET(request: Request) {
  const cronSecret = getCronSecret()
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: 'cron_not_configured' }, { status: 500 })
  }

  const token = getTokenFromRequest(request)
  const tokenBuf = Buffer.from(token ?? '')
  const secretBuf = Buffer.from(cronSecret)
  if (!token || tokenBuf.length !== secretBuf.length || !crypto.timingSafeEqual(tokenBuf, secretBuf)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ ok: false, error: 'missing_service_role' }, { status: 500 })
  }

  const result = await runPendingEmailJobs({ adminClient })
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
