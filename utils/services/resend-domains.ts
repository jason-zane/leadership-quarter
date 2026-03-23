// Resend domain management helpers — used only by the email domain setup script.

import { Resend } from 'resend'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY in environment')
  }
  return new Resend(apiKey)
}

export type ResendDomain = {
  id: string
  name: string
  status: string
  records: ResendDnsRecord[]
}

export type ResendDnsRecord = {
  record: string // "SPF", "DKIM", "DKIM2", etc.
  name: string
  type: string // "TXT", "CNAME", "MX"
  value: string
  status: string // "verified", "not_started", "pending", etc.
  ttl: string
  priority?: number
}

/** Find a domain by name in Resend. Returns null if not found. */
export async function findDomainByName(name: string): Promise<ResendDomain | null> {
  const resend = getResendClient()
  const { data, error } = await resend.domains.list()
  if (error) {
    throw new Error(`Resend list domains failed: ${error.message}`)
  }
  const match = data?.data?.find((d) => d.name === name)
  if (!match) return null

  // Fetch full details to get DNS records
  return getDomainById(match.id)
}

/** Get full domain details including DNS records. */
export async function getDomainById(id: string): Promise<ResendDomain | null> {
  const resend = getResendClient()
  const { data, error } = await resend.domains.get(id)
  if (error) {
    throw new Error(`Resend get domain failed: ${error.message}`)
  }
  if (!data) return null
  return {
    id: data.id,
    name: data.name,
    status: data.status,
    records: (data.records ?? []) as ResendDnsRecord[],
  }
}

/** Create a sending domain in Resend and return its details + DNS records. */
export async function createDomain(name: string): Promise<ResendDomain> {
  const resend = getResendClient()
  const { data, error } = await resend.domains.create({ name })
  if (error) {
    throw new Error(`Resend create domain failed: ${error.message}`)
  }
  if (!data) {
    throw new Error('Resend create domain returned no data')
  }
  return {
    id: data.id,
    name: data.name,
    status: data.status,
    records: (data.records ?? []) as ResendDnsRecord[],
  }
}

/** Trigger domain verification in Resend. */
export async function verifyDomain(id: string): Promise<void> {
  const resend = getResendClient()
  const { error } = await resend.domains.verify(id)
  if (error) {
    throw new Error(`Resend verify domain failed: ${error.message}`)
  }
}

/** Poll verification status until verified or max attempts reached. */
export async function pollVerification(
  id: string,
  maxAttempts = 12,
  intervalMs = 10_000
): Promise<ResendDomain | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const domain = await getDomainById(id)
    if (!domain) return null
    if (domain.status === 'verified') return domain

    const remaining = maxAttempts - i - 1
    if (remaining > 0) {
      console.log(
        `  Status: ${domain.status} — checking again in ${intervalMs / 1000}s (${remaining} attempts left)`
      )
      await new Promise((r) => setTimeout(r, intervalMs))
    }
  }
  console.log('  Verification did not complete within the polling window.')
  return getDomainById(id)
}
