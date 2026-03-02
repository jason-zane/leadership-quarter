#!/usr/bin/env node

import { execFile } from 'node:child_process'
import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
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

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function resolveChromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate
    }
  }

  throw new Error(
    'Chrome binary not found. Set CHROME_PATH or install Google Chrome.'
  )
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

  const chrome = await resolveChromePath()
  const inputUrl = `file://${input}`

  await new Promise((resolve, reject) => {
    const defaultFlags = [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      '--print-to-pdf-no-header',
    ]
    const extraFlags = String(process.env.CHROME_FLAGS || '')
      .split(' ')
      .map((flag) => flag.trim())
      .filter(Boolean)

    execFile(
      chrome,
      [...defaultFlags, ...extraFlags, `--print-to-pdf=${output}`, inputUrl],
      { maxBuffer: 1024 * 1024 * 10 },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `Failed to render PDF (code: ${error.code ?? 'unknown'}).\nstdout:\n${stdout}\nstderr:\n${stderr}`
            )
          )
          return
        }
        resolve()
      }
    )
  })

  console.log(`PDF created: ${output}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
