'use client'

import { useEffect, useMemo } from 'react'
import type { ReportTemplateDefinition } from '@/utils/assessments/assessment-report-template'
import { resolveBlockData, type ReportDataContext } from '@/utils/reports/assessment-report-block-data'
import { getBlockRenderer } from '@/utils/reports/assessment-report-block-registry'
import { ensureBlocksRegistered } from '@/components/reports/assessment-blocks/register-blocks'
import { PlaceholderBlock } from '@/components/reports/assessment-blocks/placeholder-block'
import { syncTemplateBlocksFromComposition } from '@/utils/reports/assessment-report-composer'

type AssessmentBlockReportViewProps = {
  template: ReportTemplateDefinition
  context: ReportDataContext
  documentMode?: boolean
  displayMode?: 'builder' | 'report'
}

export function AssessmentBlockReportView({
  template,
  context,
  documentMode,
  displayMode = 'report',
}: AssessmentBlockReportViewProps) {
  useEffect(() => {
    ensureBlocksRegistered()
  }, [])

  // Eagerly register on first render so useMemo below has renderers available
  ensureBlocksRegistered()

  const sourceBlocks = useMemo(
    () => (template.blocks.length > 0 ? template.blocks : syncTemplateBlocksFromComposition(template).blocks),
    [template]
  )

  const visibleBlocks = useMemo(() => {
    return sourceBlocks.filter((block) => {
      if (!block.enabled) return false
      if (documentMode && block.style?.pdf_hidden) return false
      return true
    })
  }, [sourceBlocks, documentMode])

  if (visibleBlocks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        No blocks configured in this template.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {visibleBlocks.map((block) => {
        const data = resolveBlockData(block, context)
        if (!data) return null

        const Renderer = getBlockRenderer(block.source, block.format)
        if (displayMode === 'builder' && !Renderer) {
          return (
            <div
              key={block.id}
              className={block.style?.pdf_break_before ? 'break-before-page' : undefined}
            >
              <PlaceholderBlock block={block} data={data} documentMode={documentMode} />
            </div>
          )
        }

        if (!Renderer) {
          return (
            <div
              key={block.id}
              className="rounded-lg border border-dashed border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
            >
              No renderer for {block.source}:{block.format}
            </div>
          )
        }

        return (
          <div
            key={block.id}
            className={block.style?.pdf_break_before ? 'break-before-page' : undefined}
          >
            <Renderer block={block} data={data} documentMode={documentMode} />
          </div>
        )
      })}
    </div>
  )
}
