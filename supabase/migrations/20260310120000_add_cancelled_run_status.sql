-- Add 'cancelled' as a valid status for psychometric_analysis_runs.
-- Required by the new cancel endpoint that sets status = 'cancelled'.

alter table public.psychometric_analysis_runs
  drop constraint if exists psychometric_analysis_runs_status_check;

alter table public.psychometric_analysis_runs
  add constraint psychometric_analysis_runs_status_check
  check (status in ('queued', 'running', 'completed', 'failed', 'approved', 'superseded', 'cancelled'));
