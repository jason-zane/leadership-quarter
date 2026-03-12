import puppeteer from 'puppeteer-core'

type RenderDocumentInput = {
  url: string
  waitForSelector?: string
  timeoutMs?: number
}

async function getExecutablePath() {
  if (process.env.NODE_ENV === 'development' || process.env.CHROMIUM_PATH) {
    return (
      process.env.CHROMIUM_PATH ??
      findLocalChrome()
    )
  }

  const chromium = await import('@sparticuz/chromium')
  return chromium.default.executablePath()
}

function findLocalChrome(): string {
  if (process.platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  }
  if (process.platform === 'win32') {
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  }
  return '/usr/bin/google-chrome'
}

async function getLaunchArgs() {
  if (process.env.NODE_ENV === 'development') {
    return ['--no-sandbox', '--disable-dev-shm-usage']
  }

  const chromium = await import('@sparticuz/chromium')
  return chromium.default.args
}

export async function renderDocumentUrlToPdf(input: RenderDocumentInput): Promise<Buffer> {
  const timeoutMs = input.timeoutMs ?? 30_000
  const waitForSelector = input.waitForSelector ?? '[data-document-ready="true"]'

  const [executablePath, args] = await Promise.all([
    getExecutablePath(),
    getLaunchArgs(),
  ])

  const browser = await puppeteer.launch({
    executablePath,
    args,
    headless: true,
    defaultViewport: { width: 1280, height: 720 },
  })

  try {
    const page = await browser.newPage()

    await page.emulateMediaType('print')
    await page.goto(input.url, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
    await page.waitForSelector(waitForSelector, { timeout: timeoutMs })
    await page.waitForNetworkIdle({ timeout: timeoutMs }).catch(() => undefined)
    await page.evaluate(async () => {
      if ('fonts' in document) {
        await document.fonts.ready
      }
    })

    const pdfUint8 = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        right: '10mm',
        bottom: '12mm',
        left: '10mm',
      },
    })

    return Buffer.from(pdfUint8)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error'
    throw new Error(`PDF render failed for ${input.url}: ${message}`)
  } finally {
    await browser.close().catch(() => undefined)
  }
}
