-- Add Cronbach's alpha to norm_stats so it can be used at report time
-- (e.g. to compute SEM bands on participant trait profile charts)
ALTER TABLE norm_stats ADD COLUMN IF NOT EXISTS alpha float;
