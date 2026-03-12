import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/hosts', () => ({ getPublicBaseUrl: vi.fn() }))
vi.mock('@/utils/pdf/chromium-renderer', () => ({ renderDocumentUrlToPdf: vi.fn() }))
vi.mock('@/utils/reports/assemble-report-document', () => ({
  assembleReportDocument: vi.fn(),
}))

import { getPublicBaseUrl } from '@/utils/hosts'
import { renderDocumentUrlToPdf } from '@/utils/pdf/chromium-renderer'
import { assembleReportDocument } from '@/utils/reports/assemble-report-document'
import { downloadReportPdf } from '@/utils/services/report-pdf'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getPublicBaseUrl).mockReturnValue('http://localhost:3001')
  vi.mocked(assembleReportDocument).mockResolvedValue({
    ok: true,
    data: {
      filename: 'assessment-report.pdf',
    },
  } as never)
  vi.mocked(renderDocumentUrlToPdf).mockResolvedValue(Buffer.from('%PDF-chromium-test'))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('downloadReportPdf', () => {
  it('renders via Chromium and returns the PDF buffer', async () => {
    const result = await downloadReportPdf({
      reportType: 'assessment',
      accessToken: 'good-token',
    })

    expect(result).toEqual({
      ok: true,
      data: {
        filename: 'assessment-report.pdf',
        pdfBuffer: Buffer.from('%PDF-chromium-test'),
      },
    })
    expect(renderDocumentUrlToPdf).toHaveBeenCalledWith({
      url: 'http://localhost:3001/document/reports/assessment?access=good-token&render=pdf',
    })
  })

  it('returns pdf_render_failed when Chromium fails', async () => {
    vi.mocked(renderDocumentUrlToPdf).mockRejectedValue(
      new Error('PDF render failed for http://localhost:3001/document/reports/assessment: browser crashed')
    )

    const result = await downloadReportPdf({
      reportType: 'assessment',
      accessToken: 'good-token',
    })

    expect(result).toEqual({
      ok: false,
      error: 'pdf_render_failed',
      message: 'PDF render failed for http://localhost:3001/document/reports/assessment: browser crashed',
    })
  })

  it('returns assemble errors unchanged', async () => {
    vi.mocked(assembleReportDocument).mockResolvedValue({
      ok: false,
      error: 'invalid_access',
      message: 'This report link is no longer valid.',
    } as never)

    const result = await downloadReportPdf({
      reportType: 'assessment',
      accessToken: 'bad-token',
    })

    expect(result).toEqual({
      ok: false,
      error: 'invalid_access',
      message: 'This report link is no longer valid.',
    })
    expect(renderDocumentUrlToPdf).not.toHaveBeenCalled()
  })
})
