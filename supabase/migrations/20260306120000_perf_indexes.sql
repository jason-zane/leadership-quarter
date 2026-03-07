-- Psychometric scoring lookup paths
create index if not exists idx_session_scores_submission_id
  on session_scores (submission_id);

create index if not exists idx_trait_scores_session_score_id
  on trait_scores (session_score_id);

create index if not exists idx_dimension_scores_session_score_id
  on dimension_scores (session_score_id);

-- Pending invitation count query on assessment overview page
-- (assessment_id + status lookup used in AssessmentOverviewPage)
create index if not exists idx_assessment_invitations_assessment_status
  on assessment_invitations (assessment_id, status);
