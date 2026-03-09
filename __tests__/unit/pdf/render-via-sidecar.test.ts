import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHtmlToPdfBuffer } from '@/utils/pdf/render-via-sidecar'

const originalSidecarUrl = process.env.SIDECAR_URL
const originalSidecarApiKey = process.env.SIDECAR_API_KEY

const fetchMock = vi.fn()

function restoreEnv(name: 'SIDECAR_URL' | 'SIDECAR_API_KEY', value: string | undefined) {
  if (value === undefined) {
    delete process.env[name]
    return
  }

  process.env[name] = value
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  process.env.SIDECAR_URL = 'http://localhost:10000'
  process.env.SIDECAR_API_KEY = 'test-key'
})

afterEach(() => {
  vi.unstubAllGlobals()
  restoreEnv('SIDECAR_URL', originalSidecarUrl)
  restoreEnv('SIDECAR_API_KEY', originalSidecarApiKey)
})

describe('renderHtmlToPdfBuffer', () => {
  it('throws when SIDECAR_URL is missing', async () => {
    delete process.env.SIDECAR_URL

    await expect(renderHtmlToPdfBuffer('<h1>Hello</h1>')).rejects.toThrow('SIDECAR_URL is not configured.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws when SIDECAR_API_KEY is missing', async () => {
    delete process.env.SIDECAR_API_KEY

    await expect(renderHtmlToPdfBuffer('<h1>Hello</h1>')).rejects.toThrow(
      'SIDECAR_API_KEY is not configured.'
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts HTML to the sidecar and returns a PDF buffer', async () => {
    fetchMock.mockResolvedValue(
      new Response(Buffer.from('%PDF-test'), {
        status: 200,
        headers: {
          'content-type': 'application/pdf',
        },
      })
    )

    const result = await renderHtmlToPdfBuffer('<h1>Hello</h1>')

    expect(result).toEqual(Buffer.from('%PDF-test'))
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:10000/render-pdf',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': 'test-key',
        },
        body: JSON.stringify({ html: '<h1>Hello</h1>' }),
        cache: 'no-store',
        signal: expect.any(AbortSignal),
      })
    )
  })

  it('throws a clear error when the sidecar returns an error response', async () => {
    fetchMock.mockResolvedValue(
      new Response('renderer unavailable', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'content-type': 'text/plain',
        },
      })
    )

    await expect(renderHtmlToPdfBuffer('<h1>Hello</h1>')).rejects.toThrow(
      'Sidecar PDF render failed with 503 Service Unavailable: renderer unavailable'
    )
  })

  it('throws a clear error when the sidecar is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    await expect(renderHtmlToPdfBuffer('<h1>Hello</h1>')).rejects.toThrow(
      'Could not reach the sidecar PDF service: fetch failed'
    )
  })

  it('throws a clear error when the sidecar request times out', async () => {
    const timeoutError = new Error('The operation was aborted due to timeout')
    timeoutError.name = 'TimeoutError'
    fetchMock.mockRejectedValue(timeoutError)

    await expect(renderHtmlToPdfBuffer('<h1>Hello</h1>')).rejects.toThrow(
      'Sidecar PDF request timed out after 30 seconds.'
    )
  })

  it('rejects non-PDF success responses', async () => {
    fetchMock.mockResolvedValue(
      new Response('not a pdf', {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      })
    )

    await expect(renderHtmlToPdfBuffer('<h1>Hello</h1>')).rejects.toThrow(
      'Sidecar returned an unexpected content type: application/json'
    )
  })
})
