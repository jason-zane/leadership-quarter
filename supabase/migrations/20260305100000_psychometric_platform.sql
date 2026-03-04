-- ============================================================
-- Psychometric Platform Migration
-- Wave A: Rename tables
-- Wave B: Rename columns
-- Wave C: New psychometric tables
-- Wave D: RLS for new tables
-- Wave E: Seed data for AI Readiness v1
-- ============================================================

-- ── Part A — Table renames ───────────────────────────────────
ALTER TABLE surveys RENAME TO assessments;
ALTER TABLE survey_questions RENAME TO assessment_questions;
ALTER TABLE survey_invitations RENAME TO assessment_invitations;
ALTER TABLE survey_submissions RENAME TO assessment_submissions;
ALTER TABLE survey_cohorts RENAME TO assessment_cohorts;

-- ── Part B — Column renames (survey_id → assessment_id) ──────
ALTER TABLE assessment_questions RENAME COLUMN survey_id TO assessment_id;
ALTER TABLE assessment_invitations RENAME COLUMN survey_id TO assessment_id;
ALTER TABLE assessment_submissions RENAME COLUMN survey_id TO assessment_id;
ALTER TABLE assessment_cohorts RENAME COLUMN survey_id TO assessment_id;
ALTER TABLE campaign_assessments RENAME COLUMN survey_id TO assessment_id;

-- ── Part C — New psychometric tables ─────────────────────────

-- Top-level groupings (Openness, Risk Posture, Capability)
CREATE TABLE assessment_dimensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  position int NOT NULL DEFAULT 0,
  UNIQUE(assessment_id, code)
);

-- Individual measurable constructs (1:1 with dimension at this stage; supports 1:many later)
CREATE TABLE assessment_traits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  dimension_id uuid REFERENCES assessment_dimensions(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  score_method text NOT NULL DEFAULT 'mean' CHECK (score_method IN ('mean', 'sum')),
  UNIQUE(assessment_id, code)
);

-- Question → trait mapping backbone (includes weight + reverse_scored flag)
CREATE TABLE trait_question_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trait_id uuid NOT NULL REFERENCES assessment_traits(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  weight float NOT NULL DEFAULT 1.0,
  reverse_scored bool NOT NULL DEFAULT false,
  UNIQUE(trait_id, question_id)
);

-- Reference populations for percentile calculations
CREATE TABLE norm_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  filters jsonb,
  n int NOT NULL DEFAULT 0,
  is_global bool NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Distribution parameters per trait per norm group
CREATE TABLE norm_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  norm_group_id uuid NOT NULL REFERENCES norm_groups(id) ON DELETE CASCADE,
  trait_id uuid NOT NULL REFERENCES assessment_traits(id) ON DELETE CASCADE,
  mean float NOT NULL,
  sd float NOT NULL,
  p10 float, p25 float, p50 float, p75 float, p90 float,
  min float, max float,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(norm_group_id, trait_id)
);

-- Narrative blocks keyed by percentile range per trait/dimension
CREATE TABLE interpretation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('trait', 'dimension', 'overall')),
  target_id uuid, -- trait_id or dimension_id
  rule_type text NOT NULL DEFAULT 'band_text' CHECK (rule_type IN ('band_text', 'coaching_tip', 'risk_flag', 'recommendation')),
  min_percentile int NOT NULL DEFAULT 0,
  max_percentile int NOT NULL DEFAULT 100,
  title text,
  body text NOT NULL,
  priority int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One scoring run per submission
CREATE TABLE session_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES assessment_submissions(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES assessments(id),
  norm_group_id uuid REFERENCES norm_groups(id),
  scoring_run_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'partial', 'failed')),
  warnings jsonb,
  computed_at timestamptz NOT NULL DEFAULT now()
);

-- Per-submission per-trait scores
CREATE TABLE trait_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_score_id uuid NOT NULL REFERENCES session_scores(id) ON DELETE CASCADE,
  trait_id uuid NOT NULL REFERENCES assessment_traits(id),
  raw_score float NOT NULL,
  raw_n int NOT NULL,
  z_score float,
  percentile int,
  band text,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_score_id, trait_id)
);

-- Per-submission per-dimension scores (aggregated from traits)
CREATE TABLE dimension_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_score_id uuid NOT NULL REFERENCES session_scores(id) ON DELETE CASCADE,
  dimension_id uuid NOT NULL REFERENCES assessment_dimensions(id),
  raw_score float NOT NULL,
  z_score float,
  percentile int,
  band text,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_score_id, dimension_id)
);

-- ── Part D — RLS for new tables ──────────────────────────────
ALTER TABLE assessment_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE trait_question_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE norm_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE norm_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE interpretation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE trait_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE dimension_scores ENABLE ROW LEVEL SECURITY;

-- Deny anon + authenticated direct access (service role bypasses RLS)
CREATE POLICY "deny_all_assessment_dimensions" ON assessment_dimensions FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "deny_all_assessment_traits" ON assessment_traits FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "deny_all_trait_question_mappings" ON trait_question_mappings FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "deny_all_norm_groups" ON norm_groups FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "deny_all_norm_stats" ON norm_stats FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "deny_all_interpretation_rules" ON interpretation_rules FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "deny_all_session_scores" ON session_scores FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "deny_all_trait_scores" ON trait_scores FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "deny_all_dimension_scores" ON dimension_scores FOR ALL TO anon, authenticated USING (false);

-- ── Part E — Seed data for AI Readiness v1 ───────────────────

DO $$
DECLARE
  v_assessment_id uuid;
  v_dim_openness uuid;
  v_dim_risk uuid;
  v_dim_capability uuid;
  v_trait_openness uuid;
  v_trait_risk uuid;
  v_trait_capability uuid;
  v_norm_group uuid;
  -- question IDs
  q1 uuid; q2 uuid; q3 uuid; q4 uuid; q5 uuid; q6 uuid;
  q7 uuid; q8 uuid; q9 uuid; q10 uuid; q11 uuid; q12 uuid;
  q13 uuid; q14 uuid; q15 uuid; q16 uuid; q17 uuid; q18 uuid;
BEGIN
  -- Get assessment id
  SELECT id INTO v_assessment_id FROM assessments WHERE key = 'ai_readiness_orientation_v1';
  IF v_assessment_id IS NULL THEN
    RAISE NOTICE 'Assessment ai_readiness_orientation_v1 not found — skipping seed';
    RETURN;
  END IF;

  -- Insert dimensions
  INSERT INTO assessment_dimensions (assessment_id, code, name, description, position) VALUES
    (v_assessment_id, 'openness', 'Openness to AI', 'Willingness and attitude toward adopting AI tools', 0)
  RETURNING id INTO v_dim_openness;

  INSERT INTO assessment_dimensions (assessment_id, code, name, description, position) VALUES
    (v_assessment_id, 'riskPosture', 'Risk Posture', 'Awareness and calibration of AI-related risks', 1)
  RETURNING id INTO v_dim_risk;

  INSERT INTO assessment_dimensions (assessment_id, code, name, description, position) VALUES
    (v_assessment_id, 'capability', 'Capability', 'Practical skill and confidence with AI tools', 2)
  RETURNING id INTO v_dim_capability;

  -- Insert traits (1:1 with dimensions)
  INSERT INTO assessment_traits (assessment_id, dimension_id, code, name, description, score_method) VALUES
    (v_assessment_id, v_dim_openness, 'openness', 'Openness to AI', 'Attitude and willingness to adopt AI', 'mean')
  RETURNING id INTO v_trait_openness;

  INSERT INTO assessment_traits (assessment_id, dimension_id, code, name, description, score_method) VALUES
    (v_assessment_id, v_dim_risk, 'riskPosture', 'Risk Posture', 'Calibrated awareness of AI risks', 'mean')
  RETURNING id INTO v_trait_risk;

  INSERT INTO assessment_traits (assessment_id, dimension_id, code, name, description, score_method) VALUES
    (v_assessment_id, v_dim_capability, 'capability', 'Capability', 'Practical AI skill and confidence', 'mean')
  RETURNING id INTO v_trait_capability;

  -- Get question IDs (q1–q18)
  SELECT id INTO q1 FROM assessment_questions WHERE assessment_id = v_assessment_id AND question_key = 'q1';
  SELECT id INTO q2 FROM assessment_questions WHERE assessment_id = v_assessment_id AND question_key = 'q2';
  SELECT id INTO q3 FROM assessment_questions WHERE assessment_id = v_assessment_id AND question_key = 'q3';
  SELECT id INTO q4 FROM assessment_questions WHERE assessment_id = v_assessment_id AND question_key = 'q4';
  SELECT id INTO q5 FROM assessment_questions WHERE assessment_id = v_assessment_id AND question_key = 'q5';
  SELECT id INTO q6 FROM assessment_questions WHERE assessment_id = v_assessment_id AND question_key = 'q6';
  SELECT id INTO q7 FROM assessment_questions WHERE assessment_id = v_assessment_id AND question_key = 'q7';
  SELECT id INTO q8 FROM assessment_questions WHERE assessment_id = v_assessment_id AND question_key = 'q8';
  SELECT id INTO q9 FROM assessment_questions WHERE assessment_id = v_assessment_id AND question_key = 'q9';
  SELECT id INTO q10 FROM assessment_questions WHERE assessment_id = v_assessment_id AND question_key = 'q10';
  SELECT id INTO q11 FROM assessment_questions WHERE assessment_id = v_assessment_id AND question_key = 'q11';
  SELECT id INTO q12 FROM assessment_questions WHERE assessment_id = v_assessment_id AND question_key = 'q12';
  SELECT id INTO q13 FROM assessment_questions WHERE assessment_id = v_assessment_id AND question_key = 'q13';
  SELECT id INTO q14 FROM assessment_questions WHERE assessment_id = v_assessment_id AND question_key = 'q14';
  SELECT id INTO q15 FROM assessment_questions WHERE assessment_id = v_assessment_id AND question_key = 'q15';
  SELECT id INTO q16 FROM assessment_questions WHERE assessment_id = v_assessment_id AND question_key = 'q16';
  SELECT id INTO q17 FROM assessment_questions WHERE assessment_id = v_assessment_id AND question_key = 'q17';
  SELECT id INTO q18 FROM assessment_questions WHERE assessment_id = v_assessment_id AND question_key = 'q18';

  -- Insert trait_question_mappings (openness: q1–q6, riskPosture: q7–q12, capability: q13–q18)
  -- q4 is reverse scored (openness), q10 (riskPosture), q16 (capability)
  IF q1 IS NOT NULL THEN INSERT INTO trait_question_mappings (trait_id, question_id, weight, reverse_scored) VALUES (v_trait_openness, q1, 1.0, false); END IF;
  IF q2 IS NOT NULL THEN INSERT INTO trait_question_mappings (trait_id, question_id, weight, reverse_scored) VALUES (v_trait_openness, q2, 1.0, false); END IF;
  IF q3 IS NOT NULL THEN INSERT INTO trait_question_mappings (trait_id, question_id, weight, reverse_scored) VALUES (v_trait_openness, q3, 1.0, false); END IF;
  IF q4 IS NOT NULL THEN INSERT INTO trait_question_mappings (trait_id, question_id, weight, reverse_scored) VALUES (v_trait_openness, q4, 1.0, true); END IF;
  IF q5 IS NOT NULL THEN INSERT INTO trait_question_mappings (trait_id, question_id, weight, reverse_scored) VALUES (v_trait_openness, q5, 1.0, false); END IF;
  IF q6 IS NOT NULL THEN INSERT INTO trait_question_mappings (trait_id, question_id, weight, reverse_scored) VALUES (v_trait_openness, q6, 1.0, false); END IF;

  IF q7  IS NOT NULL THEN INSERT INTO trait_question_mappings (trait_id, question_id, weight, reverse_scored) VALUES (v_trait_risk, q7,  1.0, false); END IF;
  IF q8  IS NOT NULL THEN INSERT INTO trait_question_mappings (trait_id, question_id, weight, reverse_scored) VALUES (v_trait_risk, q8,  1.0, false); END IF;
  IF q9  IS NOT NULL THEN INSERT INTO trait_question_mappings (trait_id, question_id, weight, reverse_scored) VALUES (v_trait_risk, q9,  1.0, false); END IF;
  IF q10 IS NOT NULL THEN INSERT INTO trait_question_mappings (trait_id, question_id, weight, reverse_scored) VALUES (v_trait_risk, q10, 1.0, true); END IF;
  IF q11 IS NOT NULL THEN INSERT INTO trait_question_mappings (trait_id, question_id, weight, reverse_scored) VALUES (v_trait_risk, q11, 1.0, false); END IF;
  IF q12 IS NOT NULL THEN INSERT INTO trait_question_mappings (trait_id, question_id, weight, reverse_scored) VALUES (v_trait_risk, q12, 1.0, false); END IF;

  IF q13 IS NOT NULL THEN INSERT INTO trait_question_mappings (trait_id, question_id, weight, reverse_scored) VALUES (v_trait_capability, q13, 1.0, false); END IF;
  IF q14 IS NOT NULL THEN INSERT INTO trait_question_mappings (trait_id, question_id, weight, reverse_scored) VALUES (v_trait_capability, q14, 1.0, false); END IF;
  IF q15 IS NOT NULL THEN INSERT INTO trait_question_mappings (trait_id, question_id, weight, reverse_scored) VALUES (v_trait_capability, q15, 1.0, false); END IF;
  IF q16 IS NOT NULL THEN INSERT INTO trait_question_mappings (trait_id, question_id, weight, reverse_scored) VALUES (v_trait_capability, q16, 1.0, true); END IF;
  IF q17 IS NOT NULL THEN INSERT INTO trait_question_mappings (trait_id, question_id, weight, reverse_scored) VALUES (v_trait_capability, q17, 1.0, false); END IF;
  IF q18 IS NOT NULL THEN INSERT INTO trait_question_mappings (trait_id, question_id, weight, reverse_scored) VALUES (v_trait_capability, q18, 1.0, false); END IF;

  -- Insert global norm group
  INSERT INTO norm_groups (assessment_id, name, description, n, is_global)
  VALUES (v_assessment_id, 'Global', 'Global norm group — grows as responses accumulate', 0, true)
  RETURNING id INTO v_norm_group;

  -- Insert interpretation rules (3 per trait: low/mid/high bands at 0/34/67 percentile boundaries)
  -- Openness
  INSERT INTO interpretation_rules (assessment_id, target_type, target_id, rule_type, min_percentile, max_percentile, title, body, priority) VALUES
    (v_assessment_id, 'trait', v_trait_openness, 'band_text', 0, 33, 'Resistant / Hesitant',
     'You approach AI with significant caution or resistance. This is understandable given the pace of change, but may limit your ability to participate in AI-driven workflows. Consider exploring low-stakes AI tools to build familiarity at your own pace.', 0),
    (v_assessment_id, 'trait', v_trait_openness, 'band_text', 34, 66, 'Conditional Adopter',
     'You are open to AI under the right conditions. You likely weigh benefits against risks carefully before engaging. This balanced stance is healthy — focus on identifying contexts where AI creates clear value for you.', 0),
    (v_assessment_id, 'trait', v_trait_openness, 'band_text', 67, 100, 'Early Adopter',
     'You embrace AI with enthusiasm and curiosity. You are likely among the first to try new tools and advocate for their use. Channel this energy into helping colleagues navigate the transition alongside you.', 0);

  -- Risk Posture
  INSERT INTO interpretation_rules (assessment_id, target_type, target_id, rule_type, min_percentile, max_percentile, title, body, priority) VALUES
    (v_assessment_id, 'trait', v_trait_risk, 'band_text', 0, 33, 'Low Risk Sensitivity',
     'You may be underestimating the risks associated with AI use. Areas such as data privacy, output accuracy, and bias deserve more attention. Building risk literacy will help you use AI more responsibly and effectively.', 0),
    (v_assessment_id, 'trait', v_trait_risk, 'band_text', 34, 66, 'Moderate Risk Awareness',
     'You have a developing awareness of AI-related risks. You recognise that AI tools have limitations, though your risk calibration may be inconsistent across contexts. Deepening your understanding of specific risk categories will strengthen your judgment.', 0),
    (v_assessment_id, 'trait', v_trait_risk, 'band_text', 67, 100, 'Calibrated & Risk-Aware',
     'You demonstrate strong awareness of AI risks and are able to weigh them appropriately against the benefits. This calibrated posture is a significant asset — use it to guide your team or organisation toward safer AI adoption practices.', 0);

  -- Capability
  INSERT INTO interpretation_rules (assessment_id, target_type, target_id, rule_type, min_percentile, max_percentile, title, body, priority) VALUES
    (v_assessment_id, 'trait', v_trait_capability, 'band_text', 0, 33, 'Low Confidence / Developing',
     'Your practical experience with AI tools is still developing. This is a great starting point — focus on building hands-on experience with accessible tools. Many capabilities can be developed quickly with deliberate practice.', 0),
    (v_assessment_id, 'trait', v_trait_capability, 'band_text', 34, 66, 'Developing',
     'You have meaningful experience with AI tools and are building competence. You can complete common tasks with AI assistance but may encounter limitations in more complex scenarios. Targeted learning in your domain will accelerate your growth.', 0),
    (v_assessment_id, 'trait', v_trait_capability, 'band_text', 67, 100, 'Confident & Skilled',
     'You demonstrate strong practical capability with AI tools. You can apply AI effectively across a range of contexts and are well-positioned to take on more advanced applications or support others in your organisation.', 0);

END $$;
