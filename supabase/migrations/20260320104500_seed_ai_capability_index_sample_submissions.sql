-- Seed three builder-only sample submissions for the AI Capability Index assessment.
-- These rows use real response payloads and let the preview/report pipeline recompute
-- scoring and report context from the live question bank.

DO $$
DECLARE
  assessment_uuid uuid;
  question_bank jsonb;
  scale_points integer := 5;
  scored_item_count integer := 0;
  trait_keys text[] := '{}';
  sample_key text;
  first_name_value text;
  last_name_value text;
  email_value text;
  organisation_value text;
  role_value text;
  created_at_value timestamptz;
  response_json jsonb;
  item jsonb;
  trait_index integer;
  desired_score integer;
  raw_score integer;
  reverse_coded boolean;
BEGIN
  SELECT a.id, a.v2_question_bank
  INTO assessment_uuid, question_bank
  FROM public.assessments a
  WHERE a.key IN ('ai_capability_index', 'ai_capability_index_v1', 'ai_capability')
     OR lower(coalesce(a.name, '')) = 'ai capability index'
  ORDER BY
    CASE
      WHEN a.key = 'ai_capability_index' THEN 1
      WHEN a.key = 'ai_capability_index_v1' THEN 2
      WHEN a.key = 'ai_capability' THEN 3
      ELSE 10
    END,
    a.created_at DESC NULLS LAST
  LIMIT 1;

  IF assessment_uuid IS NULL OR question_bank IS NULL THEN
    RAISE NOTICE 'AI Capability Index assessment not found or missing question bank — skipping sample submission seed.';
    RETURN;
  END IF;

  SELECT coalesce((question_bank -> 'scale' ->> 'points')::integer, 5)
  INTO scale_points;

  SELECT count(*)::integer
  INTO scored_item_count
  FROM jsonb_array_elements(coalesce(question_bank -> 'scoredItems', '[]'::jsonb));

  IF scored_item_count = 0 THEN
    RAISE NOTICE 'AI Capability Index question bank has no scored items — skipping sample submission seed.';
    RETURN;
  END IF;

  SELECT coalesce(array_agg(elem ->> 'key' ORDER BY ordinality), '{}')
  INTO trait_keys
  FROM jsonb_array_elements(coalesce(question_bank -> 'traits', '[]'::jsonb)) WITH ORDINALITY AS t(elem, ordinality);

  DELETE FROM public.assessment_submissions
  WHERE assessment_id = assessment_uuid
    AND preview_sample_key IN ('aci_balanced_builder', 'aci_high_operator', 'aci_judgement_gap');

  FOREACH sample_key IN ARRAY ARRAY['aci_balanced_builder', 'aci_high_operator', 'aci_judgement_gap']
  LOOP
    IF sample_key = 'aci_balanced_builder' THEN
      first_name_value := 'Taylor';
      last_name_value := 'Reed';
      email_value := 'taylor.reed@lq-sample.internal';
      organisation_value := 'Horizon Advisory';
      role_value := 'Transformation Manager';
      created_at_value := now() - interval '3 days';
    ELSIF sample_key = 'aci_high_operator' THEN
      first_name_value := 'Sam';
      last_name_value := 'Patel';
      email_value := 'sam.patel@lq-sample.internal';
      organisation_value := 'Northbridge Systems';
      role_value := 'Head of Operations';
      created_at_value := now() - interval '2 days';
    ELSE
      first_name_value := 'Mina';
      last_name_value := 'Lopez';
      email_value := 'mina.lopez@lq-sample.internal';
      organisation_value := 'Crescent Partners';
      role_value := 'Senior Consultant';
      created_at_value := now() - interval '1 day';
    END IF;

    response_json := '{}'::jsonb;

    FOR item IN
      SELECT elem
      FROM jsonb_array_elements(coalesce(question_bank -> 'scoredItems', '[]'::jsonb)) AS elem
    LOOP
      trait_index := coalesce(array_position(trait_keys, item ->> 'traitKey'), 1);
      reverse_coded := coalesce((item ->> 'isReverseCoded')::boolean, false);

      desired_score := CASE sample_key
        WHEN 'aci_high_operator' THEN
          CASE
            WHEN trait_index % 2 = 0 THEN greatest(scale_points - 1, 1)
            ELSE scale_points
          END
        WHEN 'aci_judgement_gap' THEN
          CASE
            WHEN trait_index = 1 THEN scale_points
            WHEN trait_index = 2 THEN 2
            WHEN trait_index = 3 THEN greatest(scale_points - 1, 1)
            WHEN trait_index = 4 THEN 2
            ELSE greatest(least(scale_points - 1, scale_points), 3)
          END
        ELSE
          CASE
            WHEN trait_index = 1 THEN greatest(scale_points - 1, 1)
            WHEN trait_index = 2 THEN greatest(scale_points - 1, 1)
            WHEN trait_index = 3 THEN greatest(scale_points - 2, 1)
            WHEN trait_index = 4 THEN greatest(scale_points - 2, 1)
            ELSE greatest(scale_points - 1, 1)
          END
      END;

      raw_score := CASE
        WHEN reverse_coded THEN greatest(1, least(scale_points, (scale_points + 1) - desired_score))
        ELSE greatest(1, least(scale_points, desired_score))
      END;

      response_json := response_json || jsonb_build_object(item ->> 'key', raw_score);
    END LOOP;

    INSERT INTO public.assessment_submissions (
      id,
      assessment_id,
      first_name,
      last_name,
      email,
      organisation,
      role,
      consent,
      responses,
      v2_report_context,
      is_preview_sample,
      preview_sample_key,
      excluded_from_analysis,
      excluded_from_analysis_at,
      excluded_from_analysis_reason,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      assessment_uuid,
      first_name_value,
      last_name_value,
      email_value,
      organisation_value,
      role_value,
      true,
      response_json,
      '{}'::jsonb,
      true,
      sample_key,
      true,
      now(),
      'preview_sample',
      created_at_value,
      created_at_value
    );
  END LOOP;

  RAISE NOTICE 'Seeded 3 AI Capability Index preview sample submissions for assessment %.', assessment_uuid;
END $$;
