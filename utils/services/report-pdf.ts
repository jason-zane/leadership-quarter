import { getPublicBaseUrl } from '@/utils/hosts'
import { renderHtmlToPdfBuffer } from '@/utils/pdf/render-via-sidecar'
import { assembleReportDocument } from '@/utils/reports/assemble-report-document'
import type { ReportDocumentType } from '@/utils/reports/report-document-types'

const REPORT_HTML_TIMEOUT_MS = 15_000

function isTimeoutError(error: unknown) {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
}

function getErrorPreview(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, 200)
}

function injectBaseHref(html: string, baseUrl: string) {
  if (/<base\s/i.test(html)) {
    return html
  }

  const normalizedBaseUrl = new URL('/', baseUrl).toString()
  const baseTag = `<base href="${normalizedBaseUrl}">`

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`)
  }

  return `${baseTag}${html}`
}

async function fetchReportHtml(documentUrl: string) {
  let response: Response

  try {
    response = await fetch(documentUrl, {
      cache: 'no-store',
      headers: {
        accept: 'text/html',
      },
      signal: AbortSignal.timeout(REPORT_HTML_TIMEOUT_MS),
    })
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error(`Timed out fetching report HTML after 15 seconds: ${documentUrl}`)
    }

    const message = error instanceof Error ? error.message : 'unknown_error'
    throw new Error(`Could not fetch report HTML from ${documentUrl}: ${message}`)
  }

  const html = await response.text()

  if (!response.ok) {
    const detail = getErrorPreview(html)
    const suffix = detail ? `: ${detail}` : ''
    throw new Error(`Report HTML request failed with ${response.status} ${response.statusText}${suffix}`)
  }

  if (!html.trim()) {
    throw new Error(`Report HTML request returned an empty body: ${documentUrl}`)
  }

  return html
}

export type DownloadReportPdfResult =
  | {
      ok: true
      data: {
        filename: string
        pdfBuffer: Buffer
      }
    }
  | {
      ok: false
      error: 'invalid_access' | 'missing_service_role' | 'report_not_found' | 'pdf_render_failed'
      message?: string
    }

export async function downloadReportPdf(input: {
  reportType: ReportDocumentType
  accessToken: string
}): Promise<DownloadReportPdfResult> {
  const assembled = await assembleReportDocument({
    reportType: input.reportType,
    accessToken: input.accessToken,
  })

  if (!assembled.ok) {
    return assembled
  }

  const documentUrl = new URL(`/document/reports/${input.reportType}`, getPublicBaseUrl())
  documentUrl.searchParams.set('access', input.accessToken)
  documentUrl.searchParams.set('render', 'pdf')

  try {
    const html = await fetchReportHtml(documentUrl.toString())
    const pdfBuffer = await renderHtmlToPdfBuffer(injectBaseHref(html, getPublicBaseUrl()))
    return {
      ok: true,
      data: {
        filename: assembled.data.filename,
        pdfBuffer,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: 'pdf_render_failed',
      message: error instanceof Error ? error.message : 'pdf_render_failed',
    }
  }
}
