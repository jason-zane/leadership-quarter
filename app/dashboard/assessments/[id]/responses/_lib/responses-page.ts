export type Submission = {
  id: string
  first_name: string | null
  last_name: string | null
  organisation: string | null
  scores: Record<string, number>
  bands: Record<string, string>
  classification: { key?: string; label?: string } | null
  created_at: string
}

export type Cohort = {
  id: string
  name: string
  submission_ids: string[]
  created_at: string
}

export const classificationColors: Record<string, string> = {
  ai_ready_operator: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  naive_enthusiast: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  cautious_traditionalist: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  eager_but_underdeveloped: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  ai_resistant: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  developing_operator: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
}

function quoteCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

function responseCsvHeader() {
  return ['Name', 'Organisation', 'Classification', 'Openness', 'Risk Posture', 'Capability', 'Date']
}

function submissionCsvLine(row: Submission) {
  return [
    [row.first_name, row.last_name].filter(Boolean).join(' ') || '',
    row.organisation ?? '',
    row.classification?.label ?? '',
    row.scores?.openness?.toFixed(2) ?? '',
    row.scores?.riskPosture?.toFixed(2) ?? '',
    row.scores?.capability?.toFixed(2) ?? '',
    new Date(row.created_at).toLocaleDateString('en-AU'),
  ]
    .map((value) => quoteCsv(String(value)))
    .join(',')
}

export function exportResponsesCsv(rows: Submission[]) {
  const content = [responseCsvHeader().join(','), ...rows.map(submissionCsvLine)].join('\n')
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'responses.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}

export function computeAverageScores(members: Submission[]) {
  if (members.length === 0) return {}

  const keys = [...new Set(members.flatMap((member) => Object.keys(member.scores ?? {})))]
  const averages: Record<string, number> = {}
  for (const key of keys) {
    const values = members
      .map((member) => member.scores?.[key])
      .filter((value): value is number => typeof value === 'number')
    if (values.length > 0) {
      averages[key] = values.reduce((sum, value) => sum + value, 0) / values.length
    }
  }

  return averages
}

export function computeClassificationDist(members: Submission[]) {
  const distribution: Record<string, number> = {}
  for (const member of members) {
    const label = member.classification?.label ?? 'Unknown'
    distribution[label] = (distribution[label] ?? 0) + 1
  }

  return distribution
}

export function exportCohortCsv(cohortName: string, members: Submission[]) {
  const averageScores = computeAverageScores(members)
  const averageLine = [
    'Average',
    '',
    '',
    averageScores.openness?.toFixed(2) ?? '',
    averageScores.riskPosture?.toFixed(2) ?? '',
    averageScores.capability?.toFixed(2) ?? '',
    '',
  ]
    .map((value) => quoteCsv(String(value)))
    .join(',')

  const content = [
    responseCsvHeader().join(','),
    ...members.map(submissionCsvLine),
    averageLine,
  ].join('\n')
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `cohort-${cohortName.replace(/\s+/g, '-').toLowerCase()}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function formatShortDate(date: string) {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' }).format(new Date(date))
}
