ALTER TABLE organisation_assessment_access
  ADD COLUMN IF NOT EXISTS assessment_quota integer NULL CHECK (assessment_quota IS NULL OR assessment_quota > 0);
