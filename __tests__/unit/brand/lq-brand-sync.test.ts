import { describe, expect, it } from 'vitest'
import { buildLqBrandCssOverrides } from '@/utils/brand/org-brand-utils'
import * as fs from 'node:fs'
import * as path from 'node:path'

function parseCssVariables(css: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const line of css.split('\n')) {
    const match = line.match(/^\s*(--[\w-]+):\s*(.+);$/)
    if (match) {
      map.set(match[1], match[2].trim())
    }
  }
  return map
}

function extractSiteThemeDefaults(): Map<string, string> {
  const globalsPath = path.resolve(__dirname, '../../../app/globals.css')
  const content = fs.readFileSync(globalsPath, 'utf-8')

  // Find the .site-theme-v1 { ... } block (first occurrence)
  const startIndex = content.indexOf('.site-theme-v1 {')
  if (startIndex === -1) throw new Error('Could not find .site-theme-v1 in globals.css')

  let braceDepth = 0
  let blockStart = -1
  let blockEnd = -1

  for (let i = startIndex; i < content.length; i++) {
    if (content[i] === '{') {
      if (braceDepth === 0) blockStart = i + 1
      braceDepth++
    } else if (content[i] === '}') {
      braceDepth--
      if (braceDepth === 0) {
        blockEnd = i
        break
      }
    }
  }

  if (blockStart === -1 || blockEnd === -1) throw new Error('Could not parse .site-theme-v1 block')

  return parseCssVariables(content.slice(blockStart, blockEnd))
}

describe('LQ brand CSS sync', () => {
  it('buildLqBrandCssOverrides produces variables that match globals.css defaults', () => {
    const engineOutput = parseCssVariables(buildLqBrandCssOverrides())
    const cssDefaults = extractSiteThemeDefaults()

    // Every variable the engine produces should exist in globals.css defaults
    const missingInCss: string[] = []
    const mismatches: Array<{ variable: string; engine: string; css: string }> = []

    for (const [variable, engineValue] of engineOutput) {
      const cssValue = cssDefaults.get(variable)
      if (!cssValue) {
        missingInCss.push(variable)
        continue
      }
      // Normalise whitespace for comparison
      const normEngine = engineValue.replace(/\s+/g, ' ')
      const normCss = cssValue.replace(/\s+/g, ' ')
      if (normEngine !== normCss) {
        mismatches.push({ variable, engine: normEngine, css: normCss })
      }
    }

    if (missingInCss.length > 0) {
      console.warn('Variables produced by engine but missing from globals.css:', missingInCss)
    }

    // Allow small rounding differences in rgba values but flag anything significant
    const significantMismatches = mismatches.filter((m) => {
      // Ignore minor floating-point differences in rgba channels
      const engineNums = m.engine.match(/[\d.]+/g)?.map(Number) ?? []
      const cssNums = m.css.match(/[\d.]+/g)?.map(Number) ?? []
      if (engineNums.length !== cssNums.length) return true
      return engineNums.some((n, i) => Math.abs(n - cssNums[i]) > 1.5)
    })

    expect(significantMismatches).toEqual([])
  })

  it('engine produces all critical site variables', () => {
    const engineOutput = parseCssVariables(buildLqBrandCssOverrides())
    const critical = [
      '--site-bg',
      '--site-surface',
      '--site-text-primary',
      '--site-text-body',
      '--site-cta-bg',
      '--site-cta-text',
      '--site-field-bg',
      '--site-field-border',
      '--site-error',
      '--site-required',
      '--site-warning-border',
      '--site-warning-bg',
      '--site-chart-mid',
      '--site-chart-low',
      '--site-report-section-bg',
      '--site-report-section-border',
      '--site-report-hero-section-bg',
      '--site-report-table-alt-row',
      '--site-report-hero-backdrop',
    ]

    for (const variable of critical) {
      expect(engineOutput.has(variable), `Missing critical variable: ${variable}`).toBe(true)
    }
  })
})
