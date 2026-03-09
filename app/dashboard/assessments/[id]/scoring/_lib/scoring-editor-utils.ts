export const SCALE_POINTS = [2, 3, 4, 5, 6, 7] as const
export const MATRIX_PAGE_SIZE = 100

export function toKey(value: string, fallback: string) {
  const key = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return key || fallback
}

export function downloadTextFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadJsonFile(value: unknown, filename: string) {
  downloadTextFile(JSON.stringify(value, null, 2), filename, 'application/json')
}

export function summarizeImportErrors(errors: string[]) {
  if (errors.length === 0) return 'Import failed.'
  if (errors.length === 1) return errors[0]
  return `${errors[0]} (+${errors.length - 1} more)`
}
