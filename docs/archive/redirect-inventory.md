# Redirect Inventory

Compatibility redirects that still exist in the app router. These are not canonical routes and should not be emitted by live UI flows.

| Alias route | Canonical route | Reason | Status |
| --- | --- | --- | --- |
| `/admin` | `/dashboard` | old admin front door | keep temporarily |
| `/login` | `/client-login` | old auth entrypoint | keep temporarily |
| `/portal/login` | `/client-login` | old portal login entrypoint | keep temporarily |
| `/(assess)/survey/[token]` | `/assess/i/[token]` | old invitation URL | retained for external-link compatibility |
| `/(assess)/c/[slug]` | `/assess/c/[orgSlug]/[campaignSlug]` | old campaign URL shape | retained for external-link compatibility |
| `/(assess)/c/[slug]/[campaignSlug]` | `/assess/c/[orgSlug]/[campaignSlug]` | old campaign URL shape | retained for external-link compatibility |
| `/mfa/totp/enroll` | `/dashboard` | placeholder MFA entrypoint | review later |
| `/mfa/totp/verify` | `/dashboard` | placeholder MFA entrypoint | review later |

## Notes

- `app/(site)`, `app/(assess)`, and `portal/(app)` are route groups, not duplicate public URL trees.
- See [auth-redirect-audit.md](./auth-redirect-audit.md) before deleting auth-sensitive aliases.
- Deleted in the non-auth cleanup pass:
  - `/dashboard/organisations`
  - `/dashboard/organisations/[id]`
  - `/dashboard/assessments/[id]/analytics`
  - `/dashboard/assessments/[id]/invitations`
  - `/dashboard/assessments/[id]/report`
  - `/dashboard/campaigns/[id]/assessments`
  - `/dashboard/campaigns/[id]/flow`
  - `/dashboard/campaigns/[id]/experience`
- The remaining non-auth redirects are public assessment compatibility URLs and should be deleted only when you are comfortable dropping old links/bookmarks.
