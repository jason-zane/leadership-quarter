import type { SupabaseClient } from '@supabase/supabase-js'

type QueueBacklogSnapshot = {
  pendingCount: number
  oldestPendingAgeSeconds: number | null
}

function toAgeSeconds(timestamp: string | null | undefined) {
  if (!timestamp) return null

  const parsed = Date.parse(timestamp)
  if (Number.isNaN(parsed)) return null

  return Math.max(0, Math.floor((Date.now() - parsed) / 1000))
}

async function getPendingCount(
  adminClient: SupabaseClient,
  table: 'email_jobs' | 'psychometric_analysis_runs',
  status: 'pending' | 'queued'
) {
  const { count } = await adminClient
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('status', status)

  return count ?? 0
}

export async function getEmailJobBacklogSnapshot(
  adminClient: SupabaseClient
): Promise<QueueBacklogSnapshot> {
  const [pendingCount, oldestPending] = await Promise.all([
    getPendingCount(adminClient, 'email_jobs', 'pending'),
    adminClient
      .from('email_jobs')
      .select('run_at')
      .eq('status', 'pending')
      .order('run_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  return {
    pendingCount,
    oldestPendingAgeSeconds: toAgeSeconds(oldestPending.data?.run_at ?? null),
  }
}

export async function getPsychometricAnalysisBacklogSnapshot(
  adminClient: SupabaseClient
): Promise<QueueBacklogSnapshot> {
  const [pendingCount, oldestPending] = await Promise.all([
    getPendingCount(adminClient, 'psychometric_analysis_runs', 'queued'),
    adminClient
      .from('psychometric_analysis_runs')
      .select('created_at')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  return {
    pendingCount,
    oldestPendingAgeSeconds: toAgeSeconds(oldestPending.data?.created_at ?? null),
  }
}
