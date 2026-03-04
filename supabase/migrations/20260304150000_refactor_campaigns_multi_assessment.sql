-- Drop single survey FK from campaigns
ALTER TABLE public.campaigns DROP COLUMN IF EXISTS survey_id;

-- Drop the now-unused index
DROP INDEX IF EXISTS idx_campaigns_survey_id;

-- Campaign assessments junction table
CREATE TABLE IF NOT EXISTS public.campaign_assessments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  survey_id   uuid NOT NULL REFERENCES public.surveys(id) ON DELETE RESTRICT,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, survey_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_assessments_campaign_id ON public.campaign_assessments (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_assessments_survey_id ON public.campaign_assessments (survey_id);

ALTER TABLE public.campaign_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No anonymous access" ON public.campaign_assessments;
CREATE POLICY "No anonymous access"
  ON public.campaign_assessments FOR ALL TO anon
  USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "No authenticated direct access" ON public.campaign_assessments;
CREATE POLICY "No authenticated direct access"
  ON public.campaign_assessments FOR ALL TO authenticated
  USING (false) WITH CHECK (false);
