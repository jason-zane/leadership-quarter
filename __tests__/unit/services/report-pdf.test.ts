import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/hosts', () => ({ getPublicBaseUrl: vi.fn() }))
vi.mock('@/utils/pdf/render-via-sidecar', () => ({ renderHtmlToPdfBuffer: vi.fn() }))
vi.mock('@/utils/reports/assemble-report-document', () => ({
  assembleReportDocument: vi.fn(),
}))

import { getPublicBaseUrl } from '@/utils/hosts'
import { renderHtmlToPdfBuffer } from '@/utils/pdf/render-via-sidecar'
import { assembleReportDocument } from '@/utils/reports/assemble-report-document'
import { downloadReportPdf } from '@/utils/services/report-pdf'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  vi.mocked(getPublicBaseUrl).mockReturnValue('http://localhost:3001')
  vi.mocked(assembleReportDocument).mockResolvedValue({
    ok: true,
    data: {
      filename: 'assessment-report.pdf',
    },
  } as never)
  vi.mocked(renderHtmlToPdfBuffer).mockResolvedValue(Buffer.from('%PDF-test'))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('downloadReportPdf', () => {
  it('fetches report HTML and renders it through the sidecar', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html><body>report</body></html>', {
        status: 200,
        headers: {
          'content-type': 'text/html',
        },
      })
    )

    const result = await downloadReportPdf({
      reportType: 'assessment',
      accessToken: 'good-token',
    })

    expect(result).toEqual({
      ok: true,
      data: {
        filename: 'assessment-report.pdf',
        pdfBuffer: Buffer.from('%PDF-test'),
      },
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/document/reports/assessment?access=good-token&render=pdf',
      expect.objectContaining({
        cache: 'no-store',
        headers: {
          accept: 'text/html',
        },
        signal: expect.any(AbortSignal),
      })
    )
    expect(renderHtmlToPdfBuffer).toHaveBeenCalledWith(
      '<base href="http://localhost:3001/"><html><body>report</body></html>'
    )
  })

  it('returns pdf_render_failed when the report HTML request fails', async () => {
    fetchMock.mockResolvedValue(
      new Response('missing report', {
        status: 404,
        statusText: 'Not Found',
      })
    )

    const result = await downloadReportPdf({
      reportType: 'assessment',
      accessToken: 'good-token',
    })

    expect(result).toEqual({
      ok: false,
      error: 'pdf_render_failed',
      message: 'Report HTML request failed with 404 Not Found: missing report',
    })
    expect(renderHtmlToPdfBuffer).not.toHaveBeenCalled()
  })

  it('returns pdf_render_failed when the sidecar render fails', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html><body>report</body></html>', {
        status: 200,
      })
    )
    vi.mocked(renderHtmlToPdfBuffer).mockRejectedValue(new Error('Sidecar PDF request timed out after 30 seconds.'))

    const result = await downloadReportPdf({
      reportType: 'assessment',
      accessToken: 'good-token',
    })

    expect(result).toEqual({
      ok: false,
      error: 'pdf_render_failed',
      message: 'Sidecar PDF request timed out after 30 seconds.',
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
    expect(fetchMock).not.toHaveBeenCalled()
    expect(renderHtmlToPdfBuffer).not.toHaveBeenCalled()
  })
})
