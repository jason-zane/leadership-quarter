'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import { Badge } from '@/components/ui/badge'

type Props = {
  assessmentId: string
  runId: string
  normGroupN: number
}

type Preflight = {
  warnings: string[]
  checked: boolean
}

export function ValidationRunApproveButton({ assessmentId, runId, normGroupN }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [preflight, setPreflight] = useState<Preflight | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  async function checkAndApprove() {
    setIsChecking(true)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/validation/runs/${runId}`)
      const body = await res.json()

      const warnings: string[] = []
      const scaleDiagnostics = (body.data?.scaleDiagnostics ?? []) as Array<{ scale_label?: string; alpha?: number | null }>

      for (const scale of scaleDiagnostics) {
        if (typeof scale.alpha === 'number' && scale.alpha < 0.60) {
          warnings.push(`Scale "${scale.scale_label ?? 'unknown'}" has reliability below 0.60 (α = ${scale.alpha.toFixed(2)})`)
        }
      }

      if (normGroupN < 200) {
        warnings.push(`Reference group has only n = ${normGroupN} respondents (200 recommended for stable benchmarks)`)
      }

      if (warnings.length > 0) {
        setPreflight({ warnings, checked: true })
      } else {
        await doApprove()
      }
    } catch {
      toast.error('Could not check run diagnostics.')
    } finally {
      setIsChecking(false)
    }
  }

  async function doApprove() {
    try {
      const response = await fetch(
        `/api/admin/assessments/${assessmentId}/validation/runs/${runId}/approve`,
        { method: 'POST' }
      )
      const body = await response.json()
      if (!body.ok) throw new Error(body.error ?? 'approve_failed')
      toast.success('Analysis run approved.')
      setPreflight(null)
      startTransition(() => { router.refresh() })
    } catch {
      toast.error('Could not approve analysis run.')
    }
  }

  if (preflight?.checked) {
    return (
      <FoundationSurface tone="admin" className="p-4 max-w-md space-y-3">
        <p className="text-sm font-medium text-[var(--admin-text)]">Before approving this run:</p>
        <ul className="space-y-1.5">
          {preflight.warnings.map((warning) => (
            <li key={warning} className="flex items-start gap-2 text-sm text-[var(--admin-text-muted)]">
              <Badge variant="signal-amber">Note</Badge>
              <span>{warning}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-[var(--admin-text-muted)]">Approving marks this assessment as certified. Are you sure?</p>
        <div className="flex gap-2">
          <FoundationButton variant="secondary" size="sm" onClick={() => setPreflight(null)}>
            Cancel
          </FoundationButton>
          <FoundationButton variant="primary" size="sm" onClick={() => { void doApprove() }} disabled={isPending}>
            {isPending ? 'Approving...' : 'Approve anyway'}
          </FoundationButton>
        </div>
      </FoundationSurface>
    )
  }

  return (
    <FoundationButton
      variant="primary"
      size="sm"
      onClick={() => { void checkAndApprove() }}
      disabled={isPending || isChecking}
    >
      {isChecking ? 'Checking...' : isPending ? 'Approving...' : 'Approve run'}
    </FoundationButton>
  )
}
