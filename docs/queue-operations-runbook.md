# Queue Operations Runbook

This runbook covers the background workloads that exist in the app today:

- email jobs
- report export jobs
- psychometric analysis runs

## Core endpoints

- `GET /api/cron/email-jobs`
- `GET /api/cron/report-export-jobs`
- `GET /api/cron/psychometric-analysis-jobs`

All three require:

- `Authorization: Bearer <CRON_SECRET>`

## What healthy logs should look like

Each cron run should emit a `background_job_run` log entry with:

- `job`
- `route`
- `fetched`
- `processed`
- `failed`
- `skipped`
- `pendingCount`
- `oldestPendingAgeSeconds`

Healthy shape:

- `failed` remains low
- `pendingCount` does not climb continuously
- `oldestPendingAgeSeconds` falls back down after traffic bursts

## First checks when something looks wrong

### Email jobs

1. Hit the cron route manually with `CRON_SECRET`.
2. Confirm `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `CRON_SECRET` are set.
3. Check for:
   - `email_not_configured`
   - `job_fetch_failed`
   - Resend delivery errors in logs
4. Inspect whether pending job age is growing faster than jobs are being sent.

### Report export jobs

1. Hit the cron route manually with `CRON_SECRET`.
2. Confirm `REPORT_ACCESS_TOKEN_SECRET` and storage settings are valid.
3. Check for:
   - `missing_report_secret`
   - `pdf_render_failed`
   - storage upload failures
4. Confirm the selected PDF renderer is reachable and healthy.

### Psychometric analysis runs

1. Hit the cron route manually with `CRON_SECRET`.
2. Confirm sidecar connectivity and `SIDECAR_URL` / `SIDECAR_API_KEY`.
3. Check for:
   - `analysis_run_fetch_failed`
   - `insufficient_sample`
   - sidecar connectivity errors
4. Confirm the queue is actually scheduled in production if the feature is live.

## Retry guidance

- Email jobs and report export jobs already retry through their queue tables.
- If backlog is rising, fix the root cause before repeatedly triggering the cron endpoint.
- Do not increase cron frequency until duplicate-safety and downstream limits are understood.

## Secret rotation checklist

Rotate these secrets with a controlled deploy:

- `CRON_SECRET`
- `REPORT_ACCESS_TOKEN_SECRET`
- `ASSESSMENT_GATE_TOKEN_SECRET`
- `SIDECAR_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` if compromise is suspected

After rotation:

- redeploy the affected services
- manually hit each cron endpoint once
- confirm the next automated cron run succeeds

## Escalation triggers

Escalate immediately if any of these occur:

- pending email job age remains above 15 minutes after launch-day minute cron is enabled
- pending report export age remains above 15 minutes after launch-day minute cron is enabled
- psychometric queue grows continuously for more than one scheduler interval
- repeated `rate_limit_degraded` alerts appear
- repeated signed URL or report token failures appear
- service-role or storage permission failures appear in logs
