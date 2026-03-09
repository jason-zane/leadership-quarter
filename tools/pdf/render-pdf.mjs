#!/usr/bin/env node

import { chromium } from 'playwright'
import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

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

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const input = args.input ? path.resolve(String(args.input)) : null
  const output = args.output ? path.resolve(String(args.output)) : null

  if (!input || !output) {
    throw new Error('Usage: node tools/pdf/render-pdf.mjs --input <html> --output <pdf>')
  }

  if (!(await exists(input))) {
    throw new Error(`Input HTML not found: ${input}`)
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    await page.emulateMedia({ media: 'print' })
    await page.goto(pathToFileURL(input).href, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.waitForSelector('body', { timeout: 30_000 })
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

  console.log(`PDF created with Playwright: ${output}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
