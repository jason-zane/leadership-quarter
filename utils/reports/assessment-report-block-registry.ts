// ---------------------------------------------------------------------------
// V2 Block Renderer Registry — maps source:format to React components
// ---------------------------------------------------------------------------

import type { ComponentType } from 'react'
import type { ReportBlockDefinition } from '@/utils/assessments/assessment-report-template'
import type { BlockResolvedData } from './assessment-report-block-data'

export type BlockRendererProps = {
  block: ReportBlockDefinition
  data: BlockResolvedData
  documentMode?: boolean
}

type RendererKey = `${string}:${string}`

const registry = new Map<RendererKey, ComponentType<BlockRendererProps>>()

export function registerBlockRenderer(
  source: string,
  format: string,
  component: ComponentType<BlockRendererProps>
) {
  registry.set(`${source}:${format}`, component)
}

export function getBlockRenderer(
  source: string,
  format: string
): ComponentType<BlockRendererProps> | null {
  return registry.get(`${source}:${format}`) ?? null
}

export function getRegisteredKeys(): string[] {
  return Array.from(registry.keys())
}
