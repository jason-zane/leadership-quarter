'use client'

import type { ScoringConfig, ScoringCoverageReport } from '@/utils/assessments/types'
import { BandProfileTester, ManualScoreTester } from '@/app/dashboard/assessments/[id]/scoring/_components/testing-tools'
import {
  CheckList,
  IssueList,
  SectionShell,
} from '@/app/dashboard/assessments/[id]/scoring/_components/shared'

export function TestingSection({
  config,
  checks,
  coverage,
}: {
  config: ScoringConfig
  checks: Array<{ label: string; pass: boolean; message: string }>
  coverage: ScoringCoverageReport
}) {
  return (
    <SectionShell
      title="6. Testing and Coverage"
      description="Review readiness, spot gaps, and test both score inputs and band profiles before activation."
    >
      <CheckList checks={checks} />
      <IssueList coverage={coverage} />
      <div className="grid gap-4 xl:grid-cols-2">
        <ManualScoreTester config={config} />
        <BandProfileTester config={config} />
      </div>
    </SectionShell>
  )
}
