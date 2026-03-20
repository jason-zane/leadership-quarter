-- Expand AI Readiness derived outcome mappings from 8 wildcard rules to 27 explicit entries.
-- Idempotent: no-op if the assessment does not exist.

DO $$
DECLARE
  v_assessment_id uuid;
  v_scoring_config jsonb;
  v_derived_outcomes jsonb;
  v_outcome_set_index int;
  v_new_mappings jsonb;
BEGIN
  -- Locate the assessment
  SELECT id INTO v_assessment_id
  FROM assessments
  WHERE key = 'ai_readiness_orientation_v1'
  LIMIT 1;

  IF v_assessment_id IS NULL THEN
    RAISE NOTICE 'ai_readiness_orientation_v1 assessment not found — skipping migration';
    RETURN;
  END IF;

  -- Read v2_scoring_config (with fallback path)
  SELECT
    COALESCE(
      v2_scoring_config,
      report_config -> 'v2_scoring_config'
    ) INTO v_scoring_config
  FROM assessments
  WHERE id = v_assessment_id;

  IF v_scoring_config IS NULL THEN
    RAISE NOTICE 'v2_scoring_config is null for ai_readiness_orientation_v1 — skipping migration';
    RETURN;
  END IF;

  -- Find the index of the ai_orientation_profile derived outcome set
  SELECT pos - 1 INTO v_outcome_set_index
  FROM jsonb_array_elements(v_scoring_config -> 'derivedOutcomes') WITH ORDINALITY AS t(elem, pos)
  WHERE t.elem ->> 'key' = 'ai_orientation_profile'
  LIMIT 1;

  IF v_outcome_set_index IS NULL THEN
    RAISE NOTICE 'ai_orientation_profile outcome set not found in v2_scoring_config — skipping migration';
    RETURN;
  END IF;

  -- Build the 27 explicit mappings
  v_new_mappings := jsonb_build_array(
    -- resistant_hesitant
    jsonb_build_object('id','map_01','combination',jsonb_build_object('openness','resistant_hesitant','riskPosture','low_risk_sensitivity','capability','low_confidence'),'outcomeKey','ai_resistant','rationale','Resistant and low-skill with no risk awareness — lowest readiness profile.'),
    jsonb_build_object('id','map_02','combination',jsonb_build_object('openness','resistant_hesitant','riskPosture','low_risk_sensitivity','capability','developing'),'outcomeKey','developing_operator','rationale','Some skill developing, but low openness and no risk discipline — middle zone.'),
    jsonb_build_object('id','map_03','combination',jsonb_build_object('openness','resistant_hesitant','riskPosture','low_risk_sensitivity','capability','confident_skilled'),'outcomeKey','developing_operator','rationale','Skilled but hesitant with poor risk awareness — capability without adoption momentum.'),
    jsonb_build_object('id','map_04','combination',jsonb_build_object('openness','resistant_hesitant','riskPosture','moderate_awareness','capability','low_confidence'),'outcomeKey','ai_resistant','rationale','Resistant with low capability despite some risk awareness — readiness is limited.'),
    jsonb_build_object('id','map_05','combination',jsonb_build_object('openness','resistant_hesitant','riskPosture','moderate_awareness','capability','developing'),'outcomeKey','developing_operator','rationale','Emerging capability and moderate caution, but hesitancy keeps this in a developing zone.'),
    jsonb_build_object('id','map_06','combination',jsonb_build_object('openness','resistant_hesitant','riskPosture','moderate_awareness','capability','confident_skilled'),'outcomeKey','developing_operator','rationale','Capable and reasonably cautious but low motivation to adopt — untapped potential.'),
    jsonb_build_object('id','map_07','combination',jsonb_build_object('openness','resistant_hesitant','riskPosture','calibrated_risk_aware','capability','low_confidence'),'outcomeKey','ai_resistant','rationale','Strong judgement but low skill and adoption appetite — cautious and not yet ready.'),
    jsonb_build_object('id','map_08','combination',jsonb_build_object('openness','resistant_hesitant','riskPosture','calibrated_risk_aware','capability','developing'),'outcomeKey','cautious_traditionalist','rationale','Sound judgement and developing skill but hesitant to adopt — caution drives the profile.'),
    jsonb_build_object('id','map_09','combination',jsonb_build_object('openness','resistant_hesitant','riskPosture','calibrated_risk_aware','capability','confident_skilled'),'outcomeKey','cautious_traditionalist','rationale','Strong judgement and skill, but adoption hesitancy dominates — classic cautious traditionalist.'),
    -- conditional_adopter
    jsonb_build_object('id','map_10','combination',jsonb_build_object('openness','conditional_adopter','riskPosture','low_risk_sensitivity','capability','low_confidence'),'outcomeKey','developing_operator','rationale','Selective adoption appetite but low skill and risk sensitivity — needs balanced development.'),
    jsonb_build_object('id','map_11','combination',jsonb_build_object('openness','conditional_adopter','riskPosture','low_risk_sensitivity','capability','developing'),'outcomeKey','developing_operator','rationale','Pragmatic adopter with emerging skill but weak risk discipline — middle zone.'),
    jsonb_build_object('id','map_12','combination',jsonb_build_object('openness','conditional_adopter','riskPosture','low_risk_sensitivity','capability','confident_skilled'),'outcomeKey','developing_operator','rationale','Capable conditional adopter but poor risk awareness — governance gap keeps this in developing.'),
    jsonb_build_object('id','map_13','combination',jsonb_build_object('openness','conditional_adopter','riskPosture','moderate_awareness','capability','low_confidence'),'outcomeKey','developing_operator','rationale','Moderate openness and awareness with low capability — all three axes still developing.'),
    jsonb_build_object('id','map_14','combination',jsonb_build_object('openness','conditional_adopter','riskPosture','moderate_awareness','capability','developing'),'outcomeKey','developing_operator','rationale','Broad developing zone: conditional openness, moderate caution, emerging skill.'),
    jsonb_build_object('id','map_15','combination',jsonb_build_object('openness','conditional_adopter','riskPosture','moderate_awareness','capability','confident_skilled'),'outcomeKey','developing_operator','rationale','Skilled and reasonably cautious conditional adopter — just short of AI-ready consistency.'),
    jsonb_build_object('id','map_16','combination',jsonb_build_object('openness','conditional_adopter','riskPosture','calibrated_risk_aware','capability','low_confidence'),'outcomeKey','developing_operator','rationale','Good judgement and pragmatic openness but capability still low — developing zone.'),
    jsonb_build_object('id','map_17','combination',jsonb_build_object('openness','conditional_adopter','riskPosture','calibrated_risk_aware','capability','developing'),'outcomeKey','developing_operator','rationale','Strong risk posture and selective openness with developing skill — on a positive trajectory.'),
    jsonb_build_object('id','map_18','combination',jsonb_build_object('openness','conditional_adopter','riskPosture','calibrated_risk_aware','capability','confident_skilled'),'outcomeKey','developing_operator','rationale','Capable, cautious, selective — strong foundations but adoption still conditional.'),
    -- early_adopter
    jsonb_build_object('id','map_19','combination',jsonb_build_object('openness','early_adopter','riskPosture','low_risk_sensitivity','capability','low_confidence'),'outcomeKey','naive_enthusiast','rationale','High enthusiasm and low confidence combined with poor risk calibration — naive enthusiasm.'),
    jsonb_build_object('id','map_20','combination',jsonb_build_object('openness','early_adopter','riskPosture','low_risk_sensitivity','capability','developing'),'outcomeKey','naive_enthusiast','rationale','Enthusiastic early adopter with developing skill but no risk discipline — naive profile.'),
    jsonb_build_object('id','map_21','combination',jsonb_build_object('openness','early_adopter','riskPosture','low_risk_sensitivity','capability','confident_skilled'),'outcomeKey','naive_enthusiast','rationale','Highly capable and enthusiastic but critically underweights risk — naive enthusiast.'),
    jsonb_build_object('id','map_22','combination',jsonb_build_object('openness','early_adopter','riskPosture','moderate_awareness','capability','low_confidence'),'outcomeKey','eager_but_underdeveloped','rationale','Strong motivation with moderate caution but skill has not yet caught up — eager but underdeveloped.'),
    jsonb_build_object('id','map_23','combination',jsonb_build_object('openness','early_adopter','riskPosture','moderate_awareness','capability','developing'),'outcomeKey','developing_operator','rationale','Eager adopter with moderate awareness and developing skill — positive middle zone.'),
    jsonb_build_object('id','map_24','combination',jsonb_build_object('openness','early_adopter','riskPosture','moderate_awareness','capability','confident_skilled'),'outcomeKey','developing_operator','rationale','Strong capability and openness with moderate risk awareness — close to AI-ready but governance still developing.'),
    jsonb_build_object('id','map_25','combination',jsonb_build_object('openness','early_adopter','riskPosture','calibrated_risk_aware','capability','low_confidence'),'outcomeKey','eager_but_underdeveloped','rationale','Motivated and risk-aware but skill is the limiting factor — eager and underdeveloped.'),
    jsonb_build_object('id','map_26','combination',jsonb_build_object('openness','early_adopter','riskPosture','calibrated_risk_aware','capability','developing'),'outcomeKey','developing_operator','rationale','High openness and strong judgement with developing skill — well-positioned for rapid progress.'),
    jsonb_build_object('id','map_27','combination',jsonb_build_object('openness','early_adopter','riskPosture','calibrated_risk_aware','capability','confident_skilled'),'outcomeKey','ai_ready_operator','rationale','Full readiness: high openness, sound risk judgement, and strong capability — AI-ready operator.')
  );

  -- Write the updated outcome set back
  UPDATE assessments
  SET v2_scoring_config = jsonb_set(
    v_scoring_config,
    ARRAY['derivedOutcomes', v_outcome_set_index::text, 'mappings'],
    v_new_mappings
  )
  WHERE id = v_assessment_id;

  RAISE NOTICE 'Expanded ai_orientation_profile mappings to 27 explicit entries for assessment %', v_assessment_id;
END;
$$;
