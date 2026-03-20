-- Add branding_config JSONB column to organisations
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS branding_config jsonb NOT NULL DEFAULT '{}';

-- Create the org-assets storage bucket (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-assets',
  'org-assets',
  true,
  2097152,  -- 2 MB
  ARRAY['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Service-role can insert/update/delete objects in org-assets
-- (reads are public since the bucket is public)
CREATE POLICY "Service role manages org assets"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'org-assets')
  WITH CHECK (bucket_id = 'org-assets');
