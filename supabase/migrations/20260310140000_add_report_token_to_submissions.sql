ALTER TABLE assessment_submissions
  ADD COLUMN IF NOT EXISTS report_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS assessment_submissions_report_token_idx
  ON assessment_submissions (report_token);
