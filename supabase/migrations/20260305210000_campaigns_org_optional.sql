-- Make organisation_id optional on campaigns.
-- Campaigns are standalone containers; a client association is optional.
ALTER TABLE public.campaigns
  ALTER COLUMN organisation_id DROP NOT NULL;
