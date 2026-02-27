# Backend Roadmap

## Scope
- Build an admin backend that can scale from submissions + templates to a full CRM.
- Keep Supabase as the data/auth foundation.
- Ship in phases so the app stays usable while modules expand.

## Module Structure
- `/dashboard`: overview and KPIs
- `/dashboard/submissions`: form submissions operations
- `/dashboard/contacts`: CRM contacts
- `/dashboard/emails`: template management
- `/dashboard/users`: user and role management
- `/dashboard/settings`: backend operational settings

## Build Phases
1. Admin shell and route structure.
2. CRM core schema: profiles, contacts, contact events, submission-contact linking.
3. Service layer to centralize backend logic.
4. Contacts CRM UI and workflows.
5. Users and permissions UI.
6. Overview metrics and activity feed.
7. Email operations hardening (events/versioning/test send).

## Database Push Checkpoints
- After Phase 2 migrations.
- After Phase 7 migrations.

Run:

```bash
npm run db:push
```
