// GoDaddy DNS API helpers — used only by the email domain setup script.
// Auth: sso-key {key}:{secret}
// Docs: https://developer.godaddy.com/doc/endpoint/domains

const GODADDY_API_BASE = 'https://api.godaddy.com/v1'

function getCredentials() {
  const key = process.env.GODADDY_API_KEY?.trim()
  const secret = process.env.GODADDY_API_SECRET?.trim()
  if (!key || !secret) {
    throw new Error('Missing GODADDY_API_KEY or GODADDY_API_SECRET in environment')
  }
  return { key, secret }
}

function authHeaders() {
  const { key, secret } = getCredentials()
  return {
    Authorization: `sso-key ${key}:${secret}`,
    'Content-Type': 'application/json',
  }
}

export type DnsRecord = {
  type: string
  name: string
  data: string
  ttl?: number
  priority?: number
}

/** GET records, optionally filtered by type and/or name. */
export async function getRecords(
  domain: string,
  type?: string,
  name?: string
): Promise<DnsRecord[]> {
  let url = `${GODADDY_API_BASE}/domains/${domain}/records`
  if (type) url += `/${type}`
  if (type && name) url += `/${name}`

  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GoDaddy GET records failed (${res.status}): ${body}`)
  }
  return res.json()
}

/**
 * PATCH to append records (never replaces existing records).
 * This is the safe default for adding new DNS entries.
 */
export async function addRecords(domain: string, records: DnsRecord[]): Promise<void> {
  const res = await fetch(`${GODADDY_API_BASE}/domains/${domain}/records`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(records),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GoDaddy PATCH records failed (${res.status}): ${body}`)
  }
}

/**
 * PUT to replace all records of a specific type+name.
 * Used only for rewriting the root SPF record (remove Resend, keep Google).
 * Does NOT replace all records on the domain — only those matching type+name.
 */
export async function replaceRecords(
  domain: string,
  type: string,
  name: string,
  records: DnsRecord[]
): Promise<void> {
  const res = await fetch(
    `${GODADDY_API_BASE}/domains/${domain}/records/${type}/${name}`,
    {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(records),
    }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GoDaddy PUT records/${type}/${name} failed (${res.status}): ${body}`)
  }
}

/** Check whether a record with the given type+name (and optionally data) already exists. */
export async function checkRecordExists(
  domain: string,
  type: string,
  name: string,
  data?: string
): Promise<boolean> {
  const records = await getRecords(domain, type, name)
  if (data) {
    return records.some((r) => r.data === data)
  }
  return records.length > 0
}

/**
 * Strip the root domain suffix from an FQDN to get a GoDaddy record name.
 * e.g. "resend._domainkey.mail.leadershipquarter.com" → "resend._domainkey.mail"
 * If the FQDN doesn't end with the root domain, returns it as-is.
 */
export function normalizeRecordName(fqdn: string, rootDomain: string): string {
  const suffix = `.${rootDomain}`
  if (fqdn.endsWith(suffix)) {
    return fqdn.slice(0, -suffix.length)
  }
  // Also handle trailing dot (DNS canonical form)
  if (fqdn.endsWith(`${suffix}.`)) {
    return fqdn.slice(0, -(suffix.length + 1))
  }
  return fqdn
}
