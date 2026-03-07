import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'

type FlowRow = {
  name: string
  trigger: string
  templateKey: string
  fromVar: string
  to: string
  variables: string
  delivery: 'Sync' | 'Async'
  /** Env vars that must be set for the flow to work */
  requiredVars: string[]
  /** Env vars that are optional but improve the flow */
  optionalVars: string[]
}

const FLOWS: FlowRow[] = [
  {
    name: 'Dashboard invite',
    trigger: 'POST /api/admin/assessments/[id]/invitations',
    templateKey: 'survey_invitation',
    fromVar: 'RESEND_FROM_ASSESSMENTS',
    to: 'Respondent',
    variables: 'first_name, survey_name, invitation_url',
    delivery: 'Sync',
    requiredVars: ['RESEND_API_KEY', 'RESEND_FROM_ASSESSMENTS'],
    optionalVars: ['RESEND_REPLY_TO'],
  },
  {
    name: 'Cohort invite',
    trigger: 'POST /api/admin/assessments/[id]/cohorts/[cohortId]/invitations',
    templateKey: 'survey_invitation',
    fromVar: 'RESEND_FROM_ASSESSMENTS',
    to: 'Respondent',
    variables: 'first_name, survey_name, invitation_url',
    delivery: 'Sync',
    requiredVars: ['RESEND_API_KEY', 'RESEND_FROM_ASSESSMENTS'],
    optionalVars: ['RESEND_REPLY_TO'],
  },
  {
    name: 'Campaign registration',
    trigger: 'POST /api/assessments/campaigns/[slug]/register',
    templateKey: 'survey_invitation',
    fromVar: 'RESEND_FROM_ASSESSMENTS',
    to: 'Registrant',
    variables: 'first_name, survey_name, invitation_url',
    delivery: 'Sync',
    requiredVars: ['RESEND_API_KEY', 'RESEND_FROM_ASSESSMENTS'],
    optionalVars: ['RESEND_REPLY_TO'],
  },
  {
    name: 'Resend single invitation',
    trigger: 'POST /api/admin/invitations/[id]/send',
    templateKey: 'survey_invitation',
    fromVar: 'RESEND_FROM_ASSESSMENTS',
    to: 'Respondent',
    variables: 'first_name, survey_name, invitation_url',
    delivery: 'Sync',
    requiredVars: ['RESEND_API_KEY', 'RESEND_FROM_ASSESSMENTS'],
    optionalVars: ['RESEND_REPLY_TO'],
  },
  {
    name: 'Portal campaign invite',
    trigger: 'POST /api/portal/campaigns/[id]/invitations',
    templateKey: 'survey_invitation',
    fromVar: 'RESEND_FROM_ASSESSMENTS',
    to: 'Respondent',
    variables: 'first_name, survey_name, invitation_url',
    delivery: 'Sync',
    requiredVars: ['RESEND_API_KEY', 'RESEND_FROM_ASSESSMENTS'],
    optionalVars: ['RESEND_REPLY_TO'],
  },
  {
    name: 'Assessment completion',
    trigger: 'POST /api/assessments/invitation/[token]/submit',
    templateKey: 'survey_completion_confirmation',
    fromVar: 'RESEND_FROM_REPORTS',
    to: 'Respondent',
    variables: 'first_name, survey_name, classification_label, report_url',
    delivery: 'Async',
    requiredVars: ['RESEND_API_KEY', 'RESEND_FROM_REPORTS', 'CRON_SECRET'],
    optionalVars: ['RESEND_REPLY_TO'],
  },
  {
    name: 'Assessment report PDF',
    trigger: 'Cron (assessment_report_pdf_email job)',
    templateKey: '(inline HTML — no template key)',
    fromVar: 'RESEND_FROM_REPORTS',
    to: 'Respondent',
    variables: 'inline HTML (generated)',
    delivery: 'Async',
    requiredVars: ['RESEND_API_KEY', 'RESEND_FROM_REPORTS', 'CRON_SECRET'],
    optionalVars: [],
  },
  {
    name: 'Inquiry — user confirmation',
    trigger: 'POST /api/inquiry',
    templateKey: 'inquiry_user_confirmation',
    fromVar: 'RESEND_FROM_EMAIL',
    to: 'Submitter',
    variables: '(template-defined)',
    delivery: 'Async',
    requiredVars: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'CRON_SECRET'],
    optionalVars: ['RESEND_REPLY_TO'],
  },
  {
    name: 'Inquiry — internal notification',
    trigger: 'POST /api/inquiry',
    templateKey: 'inquiry_internal_notification',
    fromVar: 'RESEND_FROM_EMAIL',
    to: 'RESEND_NOTIFICATION_TO',
    variables: '(template-defined)',
    delivery: 'Async',
    requiredVars: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'CRON_SECRET', 'RESEND_NOTIFICATION_TO'],
    optionalVars: [],
  },
  {
    name: 'AI Readiness — user confirmation',
    trigger: 'POST /api/reports/ai-readiness/request-download',
    templateKey: 'ai_readiness_report_user_confirmation',
    fromVar: 'RESEND_FROM_EMAIL',
    to: 'Submitter',
    variables: '(template-defined)',
    delivery: 'Async',
    requiredVars: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'CRON_SECRET'],
    optionalVars: ['RESEND_REPLY_TO'],
  },
  {
    name: 'AI Readiness — internal notification',
    trigger: 'POST /api/reports/ai-readiness/request-download',
    templateKey: 'ai_readiness_report_internal_notification',
    fromVar: 'RESEND_FROM_EMAIL',
    to: 'RESEND_NOTIFICATION_TO',
    variables: '(template-defined)',
    delivery: 'Async',
    requiredVars: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'CRON_SECRET', 'RESEND_NOTIFICATION_TO'],
    optionalVars: [],
  },
  {
    name: 'LQ8 report — user confirmation',
    trigger: 'POST /api/reports/lq8/request-download',
    templateKey: 'lq8_report_user_confirmation',
    fromVar: 'RESEND_FROM_EMAIL',
    to: 'Submitter',
    variables: '(template-defined)',
    delivery: 'Async',
    requiredVars: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'CRON_SECRET'],
    optionalVars: ['RESEND_REPLY_TO'],
  },
  {
    name: 'LQ8 report — internal notification',
    trigger: 'POST /api/reports/lq8/request-download',
    templateKey: 'lq8_report_internal_notification',
    fromVar: 'RESEND_FROM_EMAIL',
    to: 'RESEND_NOTIFICATION_TO',
    variables: '(template-defined)',
    delivery: 'Async',
    requiredVars: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'CRON_SECRET', 'RESEND_NOTIFICATION_TO'],
    optionalVars: [],
  },
  {
    name: 'Portal support — internal notification',
    trigger: 'POST /api/portal/support',
    templateKey: 'portal_support_internal_notification',
    fromVar: 'RESEND_FROM_EMAIL',
    to: 'RESEND_NOTIFICATION_TO',
    variables: '(template-defined)',
    delivery: 'Async',
    requiredVars: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'CRON_SECRET', 'RESEND_NOTIFICATION_TO'],
    optionalVars: [],
  },
  {
    name: 'Portal support — user confirmation',
    trigger: 'POST /api/portal/support',
    templateKey: 'portal_support_user_confirmation',
    fromVar: 'RESEND_FROM_EMAIL',
    to: 'Portal user',
    variables: '(template-defined)',
    delivery: 'Async',
    requiredVars: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'CRON_SECRET'],
    optionalVars: ['RESEND_REPLY_TO'],
  },
]

function resolveEnvVar(varName: string): { value: string; missing: boolean } {
  if (varName === '—') return { value: '—', missing: false }

  const raw = process.env[varName]?.trim()

  // Mirror fallback logic from getEmailConfig()
  if (!raw) {
    if (varName === 'RESEND_FROM_ASSESSMENTS' || varName === 'RESEND_FROM_REPORTS') {
      const fallback = process.env.RESEND_FROM_EMAIL?.trim()
      if (fallback) return { value: `${fallback} (via RESEND_FROM_EMAIL)`, missing: false }
    }
    return { value: 'NOT SET', missing: true }
  }

  return { value: raw, missing: false }
}

type FlowStatus = 'green' | 'amber' | 'red'

function getFlowStatus(flow: FlowRow): FlowStatus {
  for (const v of flow.requiredVars) {
    if (resolveEnvVar(v).missing) return 'red'
  }
  for (const v of flow.optionalVars) {
    if (resolveEnvVar(v).missing) return 'amber'
  }
  return 'green'
}

const STATUS_DOT: Record<FlowStatus, { cls: string; label: string }> = {
  green: { cls: 'bg-emerald-500', label: 'All vars set' },
  amber: { cls: 'bg-amber-400', label: 'Optional var missing' },
  red: { cls: 'bg-red-500', label: 'Required var missing — flow will fail' },
}

export default function EmailConfigPage() {
  const env: Record<string, { value: string; missing: boolean }> = {}
  for (const varName of [
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'RESEND_FROM_ASSESSMENTS',
    'RESEND_FROM_REPORTS',
    'RESEND_REPLY_TO',
    'RESEND_NOTIFICATION_TO',
    'CRON_SECRET',
  ]) {
    env[varName] = resolveEnvVar(varName)
  }

  const apiKeyOk = !env['RESEND_API_KEY'].missing
  const cronOk = !env['CRON_SECRET'].missing

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Email operations"
        title="Email Configuration"
        description="Read-only view of every email flow — trigger route, template key, From address, and required env vars."
      />

      {/* Environment variable summary */}
      <div className="foundation-surface foundation-surface-admin rounded-xl p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--admin-text-soft)]">
          Environment variables
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(env).map(([varName, { value, missing }]) => (
            <div key={varName} className="flex flex-col gap-0.5 rounded-lg border border-[var(--admin-border)] p-3">
              <span className="font-mono text-[11px] text-[var(--admin-text-muted)]">{varName}</span>
              <span
                className={[
                  'truncate text-xs font-medium',
                  missing ? 'text-red-600' : 'text-[var(--admin-text-primary)]',
                ].join(' ')}
                title={value}
              >
                {varName === 'RESEND_API_KEY' && !missing ? '••••••••' : value}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span
            className={[
              'rounded-full px-2.5 py-0.5 font-semibold',
              apiKeyOk ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
            ].join(' ')}
          >
            Resend API key {apiKeyOk ? 'set' : 'MISSING'}
          </span>
          <span
            className={[
              'rounded-full px-2.5 py-0.5 font-semibold',
              cronOk ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
            ].join(' ')}
          >
            CRON_SECRET {cronOk ? 'set' : 'MISSING'}
          </span>
          <span className="rounded-full bg-[var(--admin-accent-soft)] px-2.5 py-0.5 font-semibold text-[var(--admin-accent-strong)]">
            Cron schedule: */5 * * * * (every 5 min)
          </span>
        </div>
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap gap-4 text-xs text-[var(--admin-text-soft)]">
        {(Object.entries(STATUS_DOT) as [FlowStatus, { cls: string; label: string }][]).map(([, { cls, label }]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />
            {label}
          </span>
        ))}
      </div>

      {/* Flow table */}
      <DashboardDataTableShell>
        <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[rgba(255,255,255,0.68)] text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
            <tr>
              <th className="px-4 py-3 w-4"></th>
              <th className="px-4 py-3">Flow</th>
              <th className="px-4 py-3">Trigger</th>
              <th className="px-4 py-3">Template key</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">To</th>
              <th className="px-4 py-3">Variables</th>
              <th className="px-4 py-3">Delivery</th>
            </tr>
          </thead>
          <tbody>
            {FLOWS.map((flow) => {
              const fromResolved = resolveEnvVar(flow.fromVar)
              const toIsVar = flow.to.startsWith('RESEND_')
              const toResolved = toIsVar ? resolveEnvVar(flow.to) : { value: flow.to, missing: false }
              const status = getFlowStatus(flow)
              const dot = STATUS_DOT[status]

              return (
                <tr key={flow.name + flow.templateKey} className="border-t border-[var(--admin-border)] align-top">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${dot.cls}`}
                      title={dot.label}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-[var(--admin-text-primary)] whitespace-nowrap">
                    {flow.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-[var(--admin-text-muted)] whitespace-nowrap">
                    {flow.trigger}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-[var(--admin-text-muted)]">
                    {flow.templateKey}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={fromResolved.missing ? 'text-red-600' : 'text-[var(--admin-text-primary)]'}>
                      {fromResolved.value}
                    </span>
                    {!fromResolved.missing && (
                      <span className="ml-1 font-mono text-[10px] text-[var(--admin-text-muted)]">
                        ({flow.fromVar})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {toIsVar ? (
                      <span className={toResolved.missing ? 'text-red-600' : 'text-[var(--admin-text-primary)]'}>
                        {toResolved.missing ? `NOT SET (${flow.to})` : toResolved.value}
                      </span>
                    ) : (
                      <span className="text-[var(--admin-text-soft)]">{flow.to}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--admin-text-muted)] max-w-[200px]">
                    {flow.variables}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        'rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
                        flow.delivery === 'Sync'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700',
                      ].join(' ')}
                    >
                      {flow.delivery}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </DashboardDataTableShell>
    </DashboardPageShell>
  )
}
