export function logRequest(meta: {
  route: string
  status: number
  durationMs: number
  traceId?: string
  assessmentId?: string
  invitationId?: string
  error?: string
}) {
  console.log(JSON.stringify({ ...meta, ts: Date.now() }))
}
