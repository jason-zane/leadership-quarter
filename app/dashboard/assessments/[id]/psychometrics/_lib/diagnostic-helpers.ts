import type { PsychometricScaleDiagnostic } from '@/utils/assessments/assessment-psychometric-structure'

export function signalPill(signal: PsychometricScaleDiagnostic['signal']) {
  switch (signal) {
    case 'green':
      return 'rounded-full bg-emerald-100 px-2.5 py-1 text-xs text-emerald-800'
    case 'amber':
      return 'rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-800'
    case 'red':
      return 'rounded-full bg-red-100 px-2.5 py-1 text-xs text-red-700'
    default:
      return 'rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700'
  }
}

export function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
