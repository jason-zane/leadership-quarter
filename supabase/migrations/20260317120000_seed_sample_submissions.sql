-- Seed three sample assessment submissions for the AI Readiness assessment.
-- These provide realistic preview data for the V2 report builder without
-- requiring actual participant submissions.

DO $$
DECLARE
  assessment_uuid UUID;
BEGIN
  SELECT id INTO assessment_uuid
  FROM assessments
  WHERE key = 'ai_readiness_orientation_v1'
  LIMIT 1;

  IF assessment_uuid IS NULL THEN
    RAISE NOTICE 'ai_readiness_orientation_v1 assessment not found — skipping sample submission seed.';
    RETURN;
  END IF;

  -- Remove any previously seeded sample rows so this migration is idempotent.
  DELETE FROM assessment_submissions
  WHERE assessment_id = assessment_uuid
    AND email LIKE '%@lq-sample.internal';

  -- ── Profile 1: Alex Morgan — Developing Operator ───────────────────────────
  INSERT INTO assessment_submissions (
    id, assessment_id,
    first_name, last_name, email, organisation, role,
    consent, responses,
    v2_report_context,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(), assessment_uuid,
    'Alex', 'Morgan', 'alex.morgan@lq-sample.internal',
    'Northshore Group', 'People Operations Manager',
    true,
    '{"q1":4,"q2":4,"q3":3,"q4":3,"q5":4,"q6":3,"q7":3,"q8":3,"q9":3,"q10":3,"q11":3,"q12":2,"q13":3,"q14":4,"q15":3,"q16":3,"q17":3,"q18":3}'::jsonb,
    '{
      "personName": "Alex Morgan",
      "role": "People Operations Manager",
      "organisation": "Northshore Group",
      "classification": {
        "key": "developing_operator",
        "label": "Developing Operator",
        "description": "Shows some readiness, but still needs balanced development across the model."
      },
      "dimension_scores": [
        {"key": "openness",     "label": "Openness to AI", "value": 67, "band": "Conditional Adopter"},
        {"key": "riskPosture",  "label": "Risk Posture",   "value": 58, "band": "Moderate Awareness"},
        {"key": "capability",   "label": "Capability",     "value": 61, "band": "Developing"}
      ],
      "competency_scores": [],
      "trait_scores": [
        {"key": "curiosity",  "label": "Curiosity",  "value": 67, "band": "Conditional Adopter"},
        {"key": "judgement",  "label": "Judgement",  "value": 58, "band": "Moderate Awareness"},
        {"key": "skill",      "label": "Skill",      "value": 61, "band": "Developing"}
      ],
      "interpretations": [
        {
          "key": "interp_1",
          "label": "Consistent engagement emerging",
          "description": "Alex actively uses AI tools day-to-day, showing solid baseline engagement and a willingness to experiment."
        },
        {
          "key": "interp_2",
          "label": "Judgement routines need strengthening",
          "description": "Risk and verification habits are not yet consistent, creating some exposure in sensitive or high-stakes workflows."
        },
        {
          "key": "interp_3",
          "label": "Capability is building",
          "description": "Practical skills are functional but would benefit from deliberate practice, especially in more complex or ambiguous use cases."
        }
      ],
      "recommendations": [
        {
          "key": "rec_1",
          "label": "Build a verification habit",
          "description": "Create a short personal checklist for reviewing AI outputs — covering accuracy, privacy, and decision quality — before using them in important work."
        },
        {
          "key": "rec_2",
          "label": "Push into one stretch workflow",
          "description": "Choose a more complex workflow and use it deliberately to build capability. Document what works and what does not."
        },
        {
          "key": "rec_3",
          "label": "Learn from capable peers",
          "description": "Observe how colleagues who use AI well integrate it into their work, and borrow the patterns that fit your context best."
        }
      ],
      "static_content": "Sample profile generated for V2 report builder preview."
    }'::jsonb,
    NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
  );

  -- ── Profile 2: Jordan Ellis — AI Ready Operator ────────────────────────────
  INSERT INTO assessment_submissions (
    id, assessment_id,
    first_name, last_name, email, organisation, role,
    consent, responses,
    v2_report_context,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(), assessment_uuid,
    'Jordan', 'Ellis', 'jordan.ellis@lq-sample.internal',
    'Apex Digital', 'Head of Strategy',
    true,
    '{"q1":5,"q2":5,"q3":5,"q4":2,"q5":5,"q6":4,"q7":5,"q8":4,"q9":4,"q10":2,"q11":4,"q12":4,"q13":5,"q14":5,"q15":4,"q16":2,"q17":4,"q18":5}'::jsonb,
    '{
      "personName": "Jordan Ellis",
      "role": "Head of Strategy",
      "organisation": "Apex Digital",
      "classification": {
        "key": "ai_ready_operator",
        "label": "AI Ready Operator",
        "description": "Demonstrates strong readiness across all three axes of the model."
      },
      "dimension_scores": [
        {"key": "openness",     "label": "Openness to AI", "value": 88, "band": "Early Adopter"},
        {"key": "riskPosture",  "label": "Risk Posture",   "value": 82, "band": "Calibrated & Risk-Aware"},
        {"key": "capability",   "label": "Capability",     "value": 85, "band": "Confident & Skilled"}
      ],
      "competency_scores": [],
      "trait_scores": [
        {"key": "curiosity",  "label": "Curiosity",  "value": 88, "band": "Early Adopter"},
        {"key": "judgement",  "label": "Judgement",  "value": 82, "band": "Calibrated & Risk-Aware"},
        {"key": "skill",      "label": "Skill",      "value": 85, "band": "Confident & Skilled"}
      ],
      "interpretations": [
        {
          "key": "interp_1",
          "label": "Strong readiness across all axes",
          "description": "Jordan demonstrates high scores across openness, risk posture, and capability — a genuinely well-rounded AI practitioner."
        },
        {
          "key": "interp_2",
          "label": "Risk posture is a genuine strength",
          "description": "Verification and responsible-use habits are well established and applied consistently, even under time pressure."
        },
        {
          "key": "interp_3",
          "label": "Capability converts into real output",
          "description": "Practical fluency is high and translates directly into measurable quality and efficiency improvements."
        }
      ],
      "recommendations": [
        {
          "key": "rec_1",
          "label": "Lead a peer learning session",
          "description": "Share your strongest workflows and prompt patterns with the team to scale responsible AI capability across the organisation."
        },
        {
          "key": "rec_2",
          "label": "Document edge cases and failure modes",
          "description": "Capture the scenarios where AI falls short and how you handle them. This helps the whole team build resilience."
        },
        {
          "key": "rec_3",
          "label": "Identify a high-ambiguity stretch challenge",
          "description": "Find a complex, ambiguous problem where AI can support but not replace your judgement, and push deliberately into it."
        }
      ],
      "static_content": "Sample profile generated for V2 report builder preview."
    }'::jsonb,
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
  );

  -- ── Profile 3: Priya Sharma — Naive Enthusiast ─────────────────────────────
  INSERT INTO assessment_submissions (
    id, assessment_id,
    first_name, last_name, email, organisation, role,
    consent, responses,
    v2_report_context,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(), assessment_uuid,
    'Priya', 'Sharma', 'priya.sharma@lq-sample.internal',
    'Meridian Partners', 'Senior Consultant',
    true,
    '{"q1":5,"q2":5,"q3":5,"q4":5,"q5":5,"q6":4,"q7":2,"q8":2,"q9":1,"q10":5,"q11":2,"q12":2,"q13":4,"q14":3,"q15":4,"q16":4,"q17":3,"q18":4}'::jsonb,
    '{
      "personName": "Priya Sharma",
      "role": "Senior Consultant",
      "organisation": "Meridian Partners",
      "classification": {
        "key": "naive_enthusiast",
        "label": "Naive Enthusiast",
        "description": "High enthusiasm for AI but with underdeveloped risk awareness and verification habits."
      },
      "dimension_scores": [
        {"key": "openness",     "label": "Openness to AI", "value": 91, "band": "Early Adopter"},
        {"key": "riskPosture",  "label": "Risk Posture",   "value": 34, "band": "Blind Trust or Low Risk Sensitivity"},
        {"key": "capability",   "label": "Capability",     "value": 68, "band": "Developing"}
      ],
      "competency_scores": [],
      "trait_scores": [
        {"key": "curiosity",  "label": "Curiosity",  "value": 91, "band": "Early Adopter"},
        {"key": "judgement",  "label": "Judgement",  "value": 34, "band": "Blind Trust or Low Risk Sensitivity"},
        {"key": "skill",      "label": "Skill",      "value": 68, "band": "Developing"}
      ],
      "interpretations": [
        {
          "key": "interp_1",
          "label": "Enthusiasm is a real asset",
          "description": "Priya is highly motivated to use AI and engages quickly when new tools or applications are visible — energy that can drive team adoption."
        },
        {
          "key": "interp_2",
          "label": "Risk awareness needs deliberate development",
          "description": "Current habits do not include enough verification or consideration of privacy and accuracy risks before using AI outputs in practice."
        },
        {
          "key": "interp_3",
          "label": "Capability is building ahead of governance",
          "description": "Skills are functional and improving, but the pace of adoption is currently outrunning the judgement routines needed to use AI responsibly."
        }
      ],
      "recommendations": [
        {
          "key": "rec_1",
          "label": "Build a personal verification checklist",
          "description": "Before using AI outputs in important work, apply a short set of quality, accuracy, and privacy checks to catch issues before they matter."
        },
        {
          "key": "rec_2",
          "label": "Slow down on high-stakes use cases",
          "description": "For decisions that affect people or require accuracy, apply more scrutiny to AI-generated content before acting on it."
        },
        {
          "key": "rec_3",
          "label": "Match enthusiasm with process",
          "description": "Your appetite for AI is a genuine strength. Pair it with a consistent approach to responsible use so that speed does not introduce risk."
        }
      ],
      "static_content": "Sample profile generated for V2 report builder preview."
    }'::jsonb,
    NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
  );

  RAISE NOTICE 'Seeded 3 sample AI Readiness submissions for assessment %.', assessment_uuid;
END $$;
