import { chromium, type Browser } from 'playwright'

type RenderDocumentInput = {
  url: string
  waitForSelector?: string
  timeoutMs?: number
}

let browserPromise: Promise<Browser> | null = null

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    })
  }

  try {
    return await browserPromise
  } catch (error) {
    browserPromise = null
    throw error
  }
}

export async function renderDocumentUrlToPdf(input: RenderDocumentInput) {
  const browser = await getBrowser()
  const context = await browser.newContext()
  const page = await context.newPage()
  const timeoutMs = input.timeoutMs ?? 30_000
  const waitForSelector = input.waitForSelector ?? '[data-document-ready="true"]'

  try {
    await page.emulateMedia({ media: 'print' })
    await page.goto(input.url, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
    await page.waitForSelector(waitForSelector, { timeout: timeoutMs })
    await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => undefined)
    await page.evaluate(async () => {
      if ('fonts' in document) {
        await document.fonts.ready
      }
    })

    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        right: '10mm',
        bottom: '12mm',
        left: '10mm',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error'
    throw new Error(`Playwright PDF render failed for ${input.url}: ${message}`)
  } finally {
    await page.close().catch(() => undefined)
    await context.close().catch(() => undefined)
  }
}
