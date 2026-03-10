-- Add per-norm-group band thresholds (nullable; null = use application defaults)
ALTER TABLE public.norm_groups
  ADD COLUMN IF NOT EXISTS band_thresholds jsonb;

COMMENT ON COLUMN public.norm_groups.band_thresholds IS
  'Optional per-group band cutpoints. Format: {"low":{"max":33},"mid":{"min":34,"max":66},"high":{"min":67}}. NULL = application defaults.';

-- Add validation stage to assessments
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS validation_stage text
  NOT NULL DEFAULT 'pilot'
  CHECK (validation_stage IN ('pilot', 'analysis', 'certified', 'review'));

COMMENT ON COLUMN public.assessments.validation_stage IS
  'Computed psychometric validation stage. pilot → analysis → certified → review.';
