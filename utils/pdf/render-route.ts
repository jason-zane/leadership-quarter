import { execFile } from 'node:child_process'
import { constants } from 'node:fs'
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

async function exists(filePath: string) {
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
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter((candidate): candidate is string => Boolean(candidate))

  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate
  }

  throw new Error('Chrome binary not found. Set CHROME_PATH to enable PDF rendering.')
}

export async function renderUrlToPdfBuffer(routeUrl: string) {
  const chrome = await resolveChromePath()
  const workingDir = await mkdtemp(path.join(tmpdir(), 'lq-report-pdf-'))
  const outputPath = path.join(workingDir, 'report.pdf')

  try {
    await new Promise<void>((resolve, reject) => {
      const defaultFlags = [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check',
        '--hide-scrollbars',
        '--no-pdf-header-footer',
        '--print-to-pdf-no-header',
        '--window-size=1600,2200',
        '--virtual-time-budget=4000',
      ]
      const extraFlags = String(process.env.CHROME_FLAGS || '')
        .split(' ')
        .map((flag) => flag.trim())
        .filter(Boolean)

      execFile(
        chrome,
        [...defaultFlags, ...extraFlags, `--print-to-pdf=${outputPath}`, routeUrl],
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

    return await readFile(outputPath)
  } finally {
    await rm(workingDir, { recursive: true, force: true })
  }
}
