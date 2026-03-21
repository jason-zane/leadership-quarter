# Access Control Matrix

## Roles

| Role | Scope | Description |
|---|---|---|
| LQ Admin | Platform-wide | Full platform control. CRUD on all resources, bypass into any org portal. |
| LQ Staff | Platform-wide | Read access to admin dashboard data. No write operations unless explicitly granted. |
| Portal Owner | Organisation | Organisation owner. Full control within their org portal. |
| Portal Admin | Organisation | Delegated admin within an org portal. Same as owner except cannot delete the org. |
| Campaign Mgr | Organisation | Can manage campaigns and invitations within the org portal but cannot manage members. |
| Viewer | Organisation | Read-only access to portal responses and exports. |
| Public | None | Unauthenticated. Can take assessments via token/slug and view own report via HMAC token. |

## Capability Matrix

| Capability | LQ Admin | LQ Staff | Portal Owner | Portal Admin | Campaign Mgr | Viewer | Public |
|---|---|---|---|---|---|---|---|
| CRUD assessments | Y | Read only | - | - | - | - | - |
| CRUD campaigns | Y | - | - | - | - | - | - |
| Manage orgs/clients | Y | - | - | - | - | - | - |
| View all submissions | Y | Y | - | - | - | - | - |
| Portal bypass (any org) | Y | If enabled | - | - | - | - | - |
| Portal: manage campaigns | - | - | Y | Y | Y | - | - |
| Portal: send invitations | - | - | Y | Y | Y | - | - |
| Portal: view responses | - | - | Y | Y | Y | Y | - |
| Portal: manage members | - | - | Y | Y | - | - | - |
| Portal: export data | - | - | Y | Y | Y | Y | - |
| Take assessment | - | - | - | - | - | - | Y (token/slug) |
| View own report | - | - | - | - | - | - | Y (HMAC token) |

## Auth Implementation

### Admin Routes (`/api/admin/*`)

- Auth gate: `requireDashboardApiAuth()` -- all 78 routes
- Write operations require `{ adminOnly: true }`
- GET operations allow staff access
- Rate limits on invitation sends (10/min), invitation creation (6/min), test email (5/min)

### Portal Routes (`/api/portal/*`)

- Auth gate: `requirePortalApiAuth()` -- all 14 routes
- Write operations restricted by `allowedRoles: ['org_owner', 'org_admin', 'campaign_manager']`
- All service functions filter by `organisationId` (query-level tenant isolation)
- Rate limits on invitation sends (6/min), exports (12/min), support (10/min)

### Public Routes (`/api/assessments/*`)

- No auth required (public campaign access)
- Protected by request-level rate limiting
- Token-based access for individual assessment/report URLs

### Portal Bypass Admin (`/api/portal/admin/*`)

- Requires `isBypassAdmin: true` check after standard auth
- Used for internal admin org context switching
- Logged to audit table

## Key Files

- `utils/assessments/api-auth.ts` -- admin auth gate
- `utils/portal-api-auth.ts` -- portal auth gate
- `utils/portal-context.ts` -- org context resolution
- `utils/portal/types.ts` -- role/permission definitions
- `utils/portal-bypass-session.ts` -- bypass token signing/verification
