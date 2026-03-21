import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { resolvePortalContext } from '@/utils/portal-context'
import type { PortalAuthContext, PortalRole } from '@/utils/portal/types'
import { warmPlatformSettings } from '@/utils/services/platform-settings-runtime'

type PortalApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation_error'
  | 'conflict'
  | 'internal_error'

function errorResponse(code: PortalApiErrorCode, status: number, message: string) {
  return NextResponse.json({ ok: false, error: code, message }, { status })
}

export type PortalApiAuthSuccess = {
  ok: true
  context: PortalAuthContext
  user: {
    id: string
    email?: string | null
  }
  adminClient: NonNullable<ReturnType<typeof createAdminClient>>
}

export type PortalApiAuthFailure = {
  ok: false
  response: NextResponse
}

export async function requirePortalApiAuth(options?: { allowedRoles?: PortalRole[] }) {
  const resolved = await resolvePortalContext()
  if (!resolved.userId) {
    return {
      ok: false,
      response: errorResponse('unauthorized', 401, 'You must be signed in to use the portal.'),
    } as PortalApiAuthFailure
  }

  const adminClient = resolved.adminClient ?? createAdminClient()
  if (!adminClient) {
    return {
      ok: false,
      response: errorResponse('internal_error', 500, 'Supabase admin credentials are not configured.'),
    } as PortalApiAuthFailure
  }

  await warmPlatformSettings(adminClient)

  const context = resolved.context
  if (!context) {
    return {
      ok: false,
      response: errorResponse('forbidden', 403, 'You do not have an active organisation membership.'),
    } as PortalApiAuthFailure
  }

  if (options?.allowedRoles && !context.isBypassAdmin && !options.allowedRoles.includes(context.role)) {
    return {
      ok: false,
      response: errorResponse('forbidden', 403, 'Your role does not allow this action.'),
    } as PortalApiAuthFailure
  }

  return {
    ok: true,
    user: { id: resolved.userId, email: resolved.email },
    context,
    adminClient,
  } as PortalApiAuthSuccess
}
