#!/usr/bin/env node

import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
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
  const routeUrl = String(args.url || '').trim()
  const output = args.output ? path.resolve(String(args.output)) : null
  const waitForSelector = String(args.waitForSelector || '[data-document-ready="true"]')

  if (!routeUrl || !output) {
    throw new Error(
      'Usage: node tools/pdf/render-route-pdf.mjs --url <http://localhost:3001/document/...> --output <pdf>'
    )
  }

  await mkdir(path.dirname(output), { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    await page.emulateMedia({ media: 'print' })
    await page.goto(routeUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.waitForSelector(waitForSelector, { timeout: 30_000 })
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined)
    await page.evaluate(async () => {
      if ('fonts' in document) {
        await document.fonts.ready
      }
    })
    await page.pdf({
      path: output,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        right: '10mm',
        bottom: '12mm',
        left: '10mm',
      },
    })
    await page.close()
  } finally {
    await browser.close()
  }

  console.log(`Route PDF created with Playwright: ${output}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
