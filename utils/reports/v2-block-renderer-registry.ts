// ---------------------------------------------------------------------------
// V2 Block Renderer Registry — maps source:format to React components
// ---------------------------------------------------------------------------

import type { ComponentType } from 'react'
import type { V2ReportBlockDefinition } from '@/utils/assessments/v2-report-template'
import type { V2BlockResolvedData } from './v2-block-data-resolvers'

export type V2BlockRendererProps = {
  block: V2ReportBlockDefinition
  data: V2BlockResolvedData
  documentMode?: boolean
}

type RendererKey = `${string}:${string}`

const registry = new Map<RendererKey, ComponentType<V2BlockRendererProps>>()

export function registerBlockRenderer(
  source: string,
  format: string,
  component: ComponentType<V2BlockRendererProps>
) {
  registry.set(`${source}:${format}`, component)
}

export function getBlockRenderer(
  source: string,
  format: string
): ComponentType<V2BlockRendererProps> | null {
  return registry.get(`${source}:${format}`) ?? null
}

export function getRegisteredKeys(): string[] {
  return Array.from(registry.keys())
}
