# Repo Hygiene

## Purpose
Keep the repository truthful, reviewable, and free of runtime residue.

## Documentation Rules
- `README.md` is the repo entrypoint.
- `docs/architecture.md` is the architecture source of truth.
- `docs/archive/` is for completed audits, checkpoints, and historical plans.
- Do not leave dated audits or finished execution plans mixed with active docs unless they are still current operating instructions.

## Generated Files
Do not commit local runtime residue such as:
- Python cache files
- test runner state
- temporary report HTML output
- local build cache output

Commit generated assets only when they are intentional fixtures or design/reference assets that are still used.

## Service Module Structure
- Prefer one canonical public entrypoint per capability.
- Use internal helper modules only when they add a real boundary.
- Avoid exposing migration-era naming in canonical service modules when the public capability name is already stable.

## Validation
Run before merge:

```bash
npm run lint
npm run build
npm run audit:repo
```
