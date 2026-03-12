import { getPublicBaseUrl } from '@/utils/hosts'
import { renderDocumentUrlToPdf } from '@/utils/pdf/chromium-renderer'
import { assembleReportDocument } from '@/utils/reports/assemble-report-document'
import type { ReportDocumentType } from '@/utils/reports/report-document-types'

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
    const pdfBuffer = await renderDocumentUrlToPdf({ url: documentUrl.toString() })

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
