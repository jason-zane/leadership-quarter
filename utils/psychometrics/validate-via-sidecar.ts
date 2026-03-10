import type {
  PsychometricValidationRequest,
  PsychometricValidationResponse,
} from '@/utils/psychometrics/validation-contract'

const SIDECAR_TIMEOUT_MS = 120_000

function getRequiredEnv(name: 'SIDECAR_URL' | 'SIDECAR_API_KEY') {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is not configured.`)
  }

  return value
}

function getValidateUrl(sidecarUrl: string) {
  const baseUrl = sidecarUrl.endsWith('/') ? sidecarUrl : `${sidecarUrl}/`
  return new URL('psychometrics/validate', baseUrl).toString()
}

function isTimeoutError(error: unknown) {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
}

export async function validatePsychometrics(
  payload: PsychometricValidationRequest
): Promise<PsychometricValidationResponse> {
  const sidecarUrl = getRequiredEnv('SIDECAR_URL')
  const sidecarApiKey = getRequiredEnv('SIDECAR_API_KEY')

  let response: Response

  try {
    response = await fetch(getValidateUrl(sidecarUrl), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': sidecarApiKey,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(SIDECAR_TIMEOUT_MS),
    })
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error('Sidecar psychometric validation timed out after 120 seconds.')
    }

    const message = error instanceof Error ? error.message : 'unknown_error'
    throw new Error(`Could not reach the sidecar psychometric service: ${message}`)
  }

  const body = (await response.json().catch(() => null)) as PsychometricValidationResponse | { detail?: string } | null
  if (!response.ok || !body) {
    const detail = body && 'detail' in body ? body.detail : `${response.status} ${response.statusText}`
    throw new Error(`Sidecar psychometric validation failed: ${detail ?? 'unknown_error'}`)
  }

  return body as PsychometricValidationResponse
}
