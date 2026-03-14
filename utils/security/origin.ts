import { headers } from 'next/headers'
import { isAllowedRequestOrigin } from '@/utils/security/request-origin'

export { getAllowedOrigins, isAllowedRequestOrigin } from '@/utils/security/request-origin'

export async function assertSameOrigin() {
  const reqHeaders = await headers()
  if (isAllowedRequestOrigin(reqHeaders)) {
    return
  }

  throw new Error('invalid_origin')
}
