#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
      continue
    }
    args[key] = next
    i += 1
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const outputPath = path.resolve(
    String(args.output || 'tools/pdf/reports/my-report.json')
  )

  const template = {
    title: 'Report Title',
    subtitle: 'A concise subtitle that frames the report purpose',
    author: 'Your Name',
    date: 'March 2026',
    summary:
      'Two to three sentences explaining what this report covers and why it matters.',
    sections: [
      {
        eyebrow: 'Section 1',
        heading: 'Main section heading',
        body: 'Write the section narrative here. Keep paragraphs concise.',
        bullets: [
          'First key point',
          'Second key point',
          'Third key point',
        ],
      },
      {
        eyebrow: 'Section 2',
        heading: 'Another heading',
        body: 'Use as many sections as needed to shape your report.',
        bullets: [],
      },
    ],
    references: [
      'Reference 1',
      'Reference 2',
    ],
  }

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, JSON.stringify(template, null, 2) + '\n', 'utf8')
  console.log(`Template created: ${outputPath}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
