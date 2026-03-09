export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function normalizeSlug(text: string) {
  return slugify(text)
}

export function isValidSlug(slug: string) {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || /^[a-z0-9]$/.test(slug)
}

export function pickRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export function getSummaryScore(scores: Record<string, unknown> | null) {
  if (!scores) return null

  const values = Object.values(scores)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))

  if (values.length === 0) return null

  const average = values.reduce((acc, value) => acc + value, 0) / values.length
  return Math.round(average * 10) / 10
}
