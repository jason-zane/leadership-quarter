const SIDECAR_TIMEOUT_MS = 30_000

function getRequiredEnv(name: 'SIDECAR_URL' | 'SIDECAR_API_KEY') {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is not configured.`)
  }

  return value
}

function getRenderPdfUrl(sidecarUrl: string) {
  const baseUrl = sidecarUrl.endsWith('/') ? sidecarUrl : `${sidecarUrl}/`
  return new URL('render-pdf', baseUrl).toString()
}

function isTimeoutError(error: unknown) {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
}

function getErrorPreview(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, 200)
}

export async function renderHtmlToPdfBuffer(html: string): Promise<Buffer> {
  const sidecarUrl = getRequiredEnv('SIDECAR_URL')
  const sidecarApiKey = getRequiredEnv('SIDECAR_API_KEY')

  let response: Response

  try {
    response = await fetch(getRenderPdfUrl(sidecarUrl), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': sidecarApiKey,
      },
      body: JSON.stringify({ html }),
      cache: 'no-store',
      signal: AbortSignal.timeout(SIDECAR_TIMEOUT_MS),
    })
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error('Sidecar PDF request timed out after 30 seconds.')
    }

    const message = error instanceof Error ? error.message : 'unknown_error'
    throw new Error(`Could not reach the sidecar PDF service: ${message}`)
  }

  const responseBuffer = Buffer.from(await response.arrayBuffer())

  if (!response.ok) {
    const detail = getErrorPreview(responseBuffer.toString('utf8'))
    const suffix = detail ? `: ${detail}` : ''
    throw new Error(`Sidecar PDF render failed with ${response.status} ${response.statusText}${suffix}`)
  }

  if (responseBuffer.length === 0) {
    throw new Error('Sidecar returned an empty PDF response.')
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  if (!contentType.includes('application/pdf')) {
    throw new Error(
      `Sidecar returned an unexpected content type: ${contentType || 'unknown'}`
    )
  }

  return responseBuffer
}
