create or replace function public.lq_condition_matches(score numeric, operator text, threshold numeric)
returns boolean
language plpgsql
immutable
as $$
begin
  if operator = '>' then
    return score > threshold;
  elsif operator = '>=' then
    return score >= threshold;
  elsif operator = '<' then
    return score < threshold;
  elsif operator = '<=' then
    return score <= threshold;
  elsif operator = '=' then
    return score = threshold;
  elsif operator = '!=' then
    return score <> threshold;
  end if;

  return false;
end;
$$;

create or replace function public.lq_classify_score_map(classifications jsonb, score_map jsonb)
returns text
language plpgsql
immutable
as $$
declare
  classification jsonb;
  condition jsonb;
  score numeric;
  matched boolean;
begin
  if jsonb_typeof(classifications) <> 'array' then
    return null;
  end if;

  for classification in
    select value
    from jsonb_array_elements(classifications)
  loop
    if jsonb_array_length(coalesce(classification->'conditions', '[]'::jsonb)) = 0 then
      return classification->>'key';
    end if;

    matched := true;
    for condition in
      select value
      from jsonb_array_elements(coalesce(classification->'conditions', '[]'::jsonb))
    loop
      score := coalesce((score_map->>(condition->>'dimension'))::numeric, 0);
      if not public.lq_condition_matches(
        score,
        coalesce(condition->>'operator', '>='),
        coalesce((condition->>'value')::numeric, 0)
      ) then
        matched := false;
        exit;
      end if;
    end loop;

    if matched then
      return classification->>'key';
    end if;
  end loop;

  return null;
end;
$$;

create or replace function public.lq_upgrade_scoring_config_v2(config jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  normalized_config jsonb := coalesce(config, '{}'::jsonb);
  scale_points integer := coalesce((normalized_config #>> '{scale_config,points}')::integer, 5);
  scale_labels jsonb := coalesce(
    normalized_config #> '{scale_config,labels}',
    '["Strongly Disagree","Disagree","Neutral","Agree","Strongly Agree"]'::jsonb
  );
  normalized_dimensions jsonb := '[]'::jsonb;
  normalized_classifications jsonb := coalesce(normalized_config->'classifications', '[]'::jsonb);
  normalized_matrix jsonb := '[]'::jsonb;
  combos jsonb[] := array['{}'::jsonb];
  next_combos jsonb[];
  dimension_entry jsonb;
  band_entry jsonb;
  combo jsonb;
  score_map jsonb;
  dimension_key text;
  dimension_label text;
  classification_key text;
  thresholds_mid numeric;
  thresholds_high numeric;
  normalized_bands jsonb;
  current_band_key text;
  band_midpoint numeric;
begin
  if normalized_config ? 'version' and (normalized_config->>'version')::integer = 2 then
    return normalized_config;
  end if;

  if jsonb_typeof(normalized_config->'dimensions') <> 'array' then
    return jsonb_build_object(
      'version', 2,
      'scale_config', jsonb_build_object('points', scale_points, 'labels', scale_labels),
      'dimensions', '[]'::jsonb,
      'classifications', normalized_classifications,
      'classification_matrix', '[]'::jsonb
    );
  end if;

  for dimension_entry in
    select value
    from jsonb_array_elements(normalized_config->'dimensions')
  loop
    dimension_key := coalesce(
      nullif(dimension_entry->>'key', ''),
      trim(both '_' from regexp_replace(lower(coalesce(dimension_entry->>'label', 'dimension')), '[^a-z0-9]+', '_', 'g'))
    );
    dimension_label := coalesce(nullif(dimension_entry->>'label', ''), initcap(replace(dimension_key, '_', ' ')));

    if jsonb_typeof(dimension_entry->'bands') = 'object' then
      thresholds_mid := coalesce((dimension_entry #>> '{thresholds,mid}')::numeric, 3);
      thresholds_high := coalesce((dimension_entry #>> '{thresholds,high}')::numeric, 4);
      normalized_bands := jsonb_build_array(
        jsonb_build_object(
          'key', 'low',
          'label', coalesce(dimension_entry #>> '{bands,low}', 'Low'),
          'min_score', 1,
          'max_score', round((thresholds_mid - 0.1)::numeric, 1)
        ),
        jsonb_build_object(
          'key', 'mid',
          'label', coalesce(dimension_entry #>> '{bands,mid}', 'Mid'),
          'min_score', thresholds_mid,
          'max_score', round((thresholds_high - 0.1)::numeric, 1)
        ),
        jsonb_build_object(
          'key', 'high',
          'label', coalesce(dimension_entry #>> '{bands,high}', 'High'),
          'min_score', thresholds_high,
          'max_score', scale_points
        )
      );
    else
      select coalesce(
        jsonb_agg(
          jsonb_strip_nulls(
            jsonb_build_object(
              'key', band_key,
              'label', band_label,
              'min_score', min_score,
              'max_score', max_score,
              'meaning', meaning
            )
          )
          order by min_score
        ),
        '[]'::jsonb
      )
      into normalized_bands
      from (
        with ranked as (
          select
            coalesce(
              nullif(item.value->>'key', ''),
              trim(both '_' from regexp_replace(lower(coalesce(item.value->>'label', 'band_' || item.ordinality)), '[^a-z0-9]+', '_', 'g'))
            ) as band_key,
            coalesce(nullif(item.value->>'label', ''), 'Band ' || item.ordinality) as band_label,
            coalesce((item.value->>'min_score')::numeric, 1) as min_score,
            case
              when item.value ? 'max_score' then (item.value->>'max_score')::numeric
              else null
            end as raw_max_score,
            nullif(item.value->>'meaning', '') as meaning
          from jsonb_array_elements(coalesce(dimension_entry->'bands', '[]'::jsonb)) with ordinality as item(value, ordinality)
        ),
        final as (
          select
            band_key,
            band_label,
            min_score,
            coalesce(raw_max_score, round((lead(min_score) over (order by min_score) - 0.1)::numeric, 1), scale_points) as max_score,
            meaning
          from ranked
        )
        select *
        from final
      ) normalized;
    end if;

    normalized_dimensions := normalized_dimensions || jsonb_build_array(
      jsonb_strip_nulls(
        jsonb_build_object(
          'key', dimension_key,
          'label', dimension_label,
          'description', nullif(dimension_entry->>'description', ''),
          'question_keys', coalesce(dimension_entry->'question_keys', '[]'::jsonb),
          'bands', normalized_bands
        )
      )
    );

    next_combos := array[]::jsonb[];
    foreach combo in array combos loop
      for band_entry in
        select value
        from jsonb_array_elements(normalized_bands)
      loop
        next_combos := array_append(
          next_combos,
          combo || jsonb_build_object(dimension_key, band_entry->>'key')
        );
      end loop;
    end loop;
    combos := next_combos;
  end loop;

  foreach combo in array combos loop
    score_map := '{}'::jsonb;

    for dimension_entry in
      select value
      from jsonb_array_elements(normalized_dimensions)
    loop
      dimension_key := dimension_entry->>'key';
      current_band_key := combo->>dimension_key;
      band_entry := null;

      select value
      into band_entry
      from jsonb_array_elements(coalesce(dimension_entry->'bands', '[]'::jsonb))
      where value->>'key' = current_band_key
      limit 1;

      if band_entry is null then
        continue;
      end if;

      band_midpoint := round(
        (
          (band_entry->>'min_score')::numeric +
          coalesce((band_entry->>'max_score')::numeric, (band_entry->>'min_score')::numeric)
        ) / 2,
        1
      );
      score_map := score_map || jsonb_build_object(dimension_key, band_midpoint);
    end loop;

    classification_key := public.lq_classify_score_map(normalized_classifications, score_map);
    if classification_key is not null then
      normalized_matrix := normalized_matrix || jsonb_build_array(
        jsonb_build_object(
          'combination', combo,
          'classification_key', classification_key
        )
      );
    end if;
  end loop;

  return jsonb_build_object(
    'version', 2,
    'scale_config', jsonb_build_object('points', scale_points, 'labels', scale_labels),
    'dimensions', normalized_dimensions,
    'classifications', normalized_classifications,
    'classification_matrix', normalized_matrix
  );
end;
$$;

update public.assessments
set
  scoring_config = public.lq_upgrade_scoring_config_v2(scoring_config),
  runner_config = jsonb_build_object(
    'intro', 'Leadership Quarter assessment',
    'title', name,
    'subtitle', coalesce(
      nullif(description, ''),
      'Answer each question based on your current experience so the results are practical, useful, and easy to act on.'
    ),
    'estimated_minutes', case
      when coalesce(runner_config->>'estimated_minutes', '') ~ '^[0-9]+$' then (runner_config->>'estimated_minutes')::integer
      else 8
    end,
    'start_cta_label', 'Start assessment',
    'completion_cta_label', 'Submit responses',
    'confirmation_copy', 'Thanks. Your responses have been recorded.',
    'completion_screen_title', 'Assessment complete',
    'completion_screen_body', 'Thank you. Your responses have been submitted successfully.',
    'completion_screen_cta_label', 'Continue',
    'completion_screen_cta_href', coalesce(nullif(public_url, ''), '/assess')
  ) || (coalesce(runner_config, '{}'::jsonb) - array[
    'intro',
    'title',
    'subtitle',
    'estimated_minutes',
    'start_cta_label',
    'completion_cta_label',
    'confirmation_copy',
    'completion_screen_title',
    'completion_screen_body',
    'completion_screen_cta_label',
    'completion_screen_cta_href'
  ]),
  report_config = jsonb_build_object(
    'title', name || ' report',
    'subtitle', 'Your current profile, score meanings, and practical next steps.',
    'next_steps_cta_label', 'Explore next steps',
    'next_steps_cta_href', coalesce(nullif(public_url, ''), '/assess')
  ) || (coalesce(report_config, '{}'::jsonb) - array[
    'title',
    'subtitle',
    'next_steps_cta_label',
    'next_steps_cta_href'
  ]),
  updated_at = now()
where true;

update public.assessments
set
  scoring_engine = 'hybrid',
  runner_config = jsonb_build_object(
    'intro', 'AI readiness assessment',
    'title', 'AI Readiness Orientation',
    'subtitle', 'Answer each question based on how you currently work with AI so the profile reflects your practical readiness, judgement, and capability.',
    'estimated_minutes', 6,
    'start_cta_label', 'Start assessment',
    'completion_cta_label', 'Submit responses',
    'confirmation_copy', 'Thanks. Your responses have been recorded.',
    'completion_screen_title', 'Assessment complete',
    'completion_screen_body', 'Your responses are in. You can now return to AI readiness resources and review your current profile.',
    'completion_screen_cta_label', 'Return to AI readiness',
    'completion_screen_cta_href', '/framework/lq-ai-readiness'
  ) || (coalesce(runner_config, '{}'::jsonb) - array[
    'intro',
    'title',
    'subtitle',
    'estimated_minutes',
    'start_cta_label',
    'completion_cta_label',
    'confirmation_copy',
    'completion_screen_title',
    'completion_screen_body',
    'completion_screen_cta_label',
    'completion_screen_cta_href'
  ]),
  report_config = jsonb_build_object(
    'title', 'AI Readiness Profile',
    'subtitle', 'Your current profile across openness, risk posture, and capability, with practical next steps.',
    'next_steps_cta_label', 'Explore AI readiness',
    'next_steps_cta_href', '/framework/lq-ai-readiness'
  ) || (coalesce(report_config, '{}'::jsonb) - array[
    'title',
    'subtitle',
    'next_steps_cta_label',
    'next_steps_cta_href'
  ]),
  scoring_config = $${
    "version": 2,
    "scale_config": {
      "points": 5,
      "labels": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]
    },
    "dimensions": [
      {
        "key": "openness",
        "label": "Openness to AI",
        "description": "Willingness and energy to engage with AI in practical work.",
        "question_keys": ["q1", "q2", "q3", "q4", "q5", "q6"],
        "bands": [
          { "key": "resistant_hesitant", "label": "Resistant / Hesitant", "min_score": 1, "max_score": 2.9, "meaning": "Prefers familiar methods and is cautious about experimenting with AI." },
          { "key": "conditional_adopter", "label": "Conditional Adopter", "min_score": 3, "max_score": 3.9, "meaning": "Open to AI when the use case feels practical, relevant, and low-risk." },
          { "key": "early_adopter", "label": "Early Adopter", "min_score": 4, "max_score": 5, "meaning": "Actively looks for ways AI can improve quality, speed, or effectiveness." }
        ]
      },
      {
        "key": "riskPosture",
        "label": "Risk Posture",
        "description": "Judgement and verification discipline when using AI outputs.",
        "question_keys": ["q7", "q8", "q9", "q10", "q11", "q12"],
        "bands": [
          { "key": "low_risk_sensitivity", "label": "Blind Trust or Low Risk Sensitivity", "min_score": 1, "max_score": 2.9, "meaning": "May underestimate the privacy, governance, or judgement risks that come with AI use." },
          { "key": "moderate_awareness", "label": "Moderate Awareness", "min_score": 3, "max_score": 3.9, "meaning": "Recognises some risks, but still needs stronger verification and decision routines." },
          { "key": "calibrated_risk_aware", "label": "Calibrated & Risk-Aware", "min_score": 4, "max_score": 5, "meaning": "Approaches AI use with strong verification, judgement, and ethical awareness." }
        ]
      },
      {
        "key": "capability",
        "label": "Capability",
        "description": "Practical fluency and confidence using AI in role-relevant work.",
        "question_keys": ["q13", "q14", "q15", "q16", "q17", "q18"],
        "bands": [
          { "key": "low_confidence", "label": "Low Confidence", "min_score": 1, "max_score": 2.9, "meaning": "Needs more confidence and practical skill to use AI well in role-relevant work." },
          { "key": "developing", "label": "Developing", "min_score": 3, "max_score": 3.9, "meaning": "Shows emerging ability, but still needs practice to use AI consistently and well." },
          { "key": "confident_skilled", "label": "Confident & Skilled", "min_score": 4, "max_score": 5, "meaning": "Uses AI with practical confidence and can combine it with sound judgement." }
        ]
      }
    ],
    "classifications": [
      {
        "key": "ai_ready_operator",
        "label": "AI-Ready Operator",
        "description": "High openness, strong capability, and sound risk judgement.",
        "conditions": [],
        "recommendations": [
          "Involve this person in AI pilot initiatives and peer enablement.",
          "Give them ownership of high-value workflows where quality and speed both matter.",
          "Use them as a benchmark for practical, responsible AI adoption behavior."
        ]
      },
      {
        "key": "naive_enthusiast",
        "label": "Naive Enthusiast",
        "description": "Enthusiastic about AI, but currently underweights risk and verification.",
        "conditions": [],
        "recommendations": [
          "Prioritize governance and output verification habits before scaling usage.",
          "Introduce simple risk-check routines for privacy, ethics, and factual reliability.",
          "Pair experimentation with quality controls to reduce avoidable errors."
        ]
      },
      {
        "key": "cautious_traditionalist",
        "label": "Cautious Traditionalist",
        "description": "Risk-aware and thoughtful, but still hesitant to adopt AI in practice.",
        "conditions": [],
        "recommendations": [
          "Build confidence through low-risk, role-relevant AI experiments.",
          "Set short practice cycles focused on value discovery, not tool complexity.",
          "Use examples of safe, high-quality AI use to reduce adoption friction."
        ]
      },
      {
        "key": "eager_but_underdeveloped",
        "label": "Eager but Underdeveloped",
        "description": "Ready to engage, but still building the practical capability to do it well.",
        "conditions": [],
        "recommendations": [
          "Focus on practical skill-building: prompting, validation, and workflow integration.",
          "Use guided templates and coaching to improve outcome quality quickly.",
          "Reinforce when to escalate to human judgement in high-stakes contexts."
        ]
      },
      {
        "key": "ai_resistant",
        "label": "AI Resistant",
        "description": "Currently reluctant to engage with AI and lacking practical confidence.",
        "conditions": [],
        "recommendations": [
          "Start with mindset and relevance: show direct role-level benefits.",
          "Use small wins to build confidence before introducing advanced practices.",
          "Combine support, structure, and repeated practice to shift adoption behavior."
        ]
      },
      {
        "key": "developing_operator",
        "label": "Developing Operator",
        "description": "Shows some readiness, but still needs balanced development across the model.",
        "conditions": [],
        "recommendations": [
          "Continue strengthening all three axes with targeted, role-specific development.",
          "Measure progress over time to move from moderate to high capability.",
          "Use practical feedback loops to improve confidence, judgement, and outcomes."
        ]
      }
    ],
    "classification_matrix": [
      { "combination": { "openness": "resistant_hesitant", "riskPosture": "low_risk_sensitivity", "capability": "low_confidence" }, "classification_key": "ai_resistant" },
      { "combination": { "openness": "resistant_hesitant", "riskPosture": "low_risk_sensitivity", "capability": "developing" }, "classification_key": "developing_operator" },
      { "combination": { "openness": "resistant_hesitant", "riskPosture": "low_risk_sensitivity", "capability": "confident_skilled" }, "classification_key": "developing_operator" },
      { "combination": { "openness": "resistant_hesitant", "riskPosture": "moderate_awareness", "capability": "low_confidence" }, "classification_key": "ai_resistant" },
      { "combination": { "openness": "resistant_hesitant", "riskPosture": "moderate_awareness", "capability": "developing" }, "classification_key": "developing_operator" },
      { "combination": { "openness": "resistant_hesitant", "riskPosture": "moderate_awareness", "capability": "confident_skilled" }, "classification_key": "developing_operator" },
      { "combination": { "openness": "resistant_hesitant", "riskPosture": "calibrated_risk_aware", "capability": "low_confidence" }, "classification_key": "ai_resistant" },
      { "combination": { "openness": "resistant_hesitant", "riskPosture": "calibrated_risk_aware", "capability": "developing" }, "classification_key": "cautious_traditionalist" },
      { "combination": { "openness": "resistant_hesitant", "riskPosture": "calibrated_risk_aware", "capability": "confident_skilled" }, "classification_key": "cautious_traditionalist" },
      { "combination": { "openness": "conditional_adopter", "riskPosture": "low_risk_sensitivity", "capability": "low_confidence" }, "classification_key": "developing_operator" },
      { "combination": { "openness": "conditional_adopter", "riskPosture": "low_risk_sensitivity", "capability": "developing" }, "classification_key": "developing_operator" },
      { "combination": { "openness": "conditional_adopter", "riskPosture": "low_risk_sensitivity", "capability": "confident_skilled" }, "classification_key": "developing_operator" },
      { "combination": { "openness": "conditional_adopter", "riskPosture": "moderate_awareness", "capability": "low_confidence" }, "classification_key": "developing_operator" },
      { "combination": { "openness": "conditional_adopter", "riskPosture": "moderate_awareness", "capability": "developing" }, "classification_key": "developing_operator" },
      { "combination": { "openness": "conditional_adopter", "riskPosture": "moderate_awareness", "capability": "confident_skilled" }, "classification_key": "developing_operator" },
      { "combination": { "openness": "conditional_adopter", "riskPosture": "calibrated_risk_aware", "capability": "low_confidence" }, "classification_key": "developing_operator" },
      { "combination": { "openness": "conditional_adopter", "riskPosture": "calibrated_risk_aware", "capability": "developing" }, "classification_key": "developing_operator" },
      { "combination": { "openness": "conditional_adopter", "riskPosture": "calibrated_risk_aware", "capability": "confident_skilled" }, "classification_key": "developing_operator" },
      { "combination": { "openness": "early_adopter", "riskPosture": "low_risk_sensitivity", "capability": "low_confidence" }, "classification_key": "naive_enthusiast" },
      { "combination": { "openness": "early_adopter", "riskPosture": "low_risk_sensitivity", "capability": "developing" }, "classification_key": "naive_enthusiast" },
      { "combination": { "openness": "early_adopter", "riskPosture": "low_risk_sensitivity", "capability": "confident_skilled" }, "classification_key": "naive_enthusiast" },
      { "combination": { "openness": "early_adopter", "riskPosture": "moderate_awareness", "capability": "low_confidence" }, "classification_key": "eager_but_underdeveloped" },
      { "combination": { "openness": "early_adopter", "riskPosture": "moderate_awareness", "capability": "developing" }, "classification_key": "developing_operator" },
      { "combination": { "openness": "early_adopter", "riskPosture": "moderate_awareness", "capability": "confident_skilled" }, "classification_key": "developing_operator" },
      { "combination": { "openness": "early_adopter", "riskPosture": "calibrated_risk_aware", "capability": "low_confidence" }, "classification_key": "eager_but_underdeveloped" },
      { "combination": { "openness": "early_adopter", "riskPosture": "calibrated_risk_aware", "capability": "developing" }, "classification_key": "developing_operator" },
      { "combination": { "openness": "early_adopter", "riskPosture": "calibrated_risk_aware", "capability": "confident_skilled" }, "classification_key": "ai_ready_operator" }
    ]
  }$$::jsonb,
  updated_at = now()
where key = 'ai_readiness_orientation_v1';

update public.assessment_dimensions
set
  name = case code
    when 'openness' then 'Openness to AI'
    when 'riskPosture' then 'Risk Posture'
    when 'capability' then 'Capability'
    else name
  end,
  description = case code
    when 'openness' then 'Willingness and energy to engage with AI in practical work.'
    when 'riskPosture' then 'Judgement and verification discipline when using AI outputs.'
    when 'capability' then 'Practical fluency and confidence using AI in role-relevant work.'
    else description
  end
where assessment_id = (select id from public.assessments where key = 'ai_readiness_orientation_v1');

update public.assessment_traits
set
  name = case code
    when 'openness' then 'Openness to AI'
    when 'riskPosture' then 'Risk Posture'
    when 'capability' then 'Capability'
    else name
  end,
  description = case code
    when 'openness' then 'Willingness and energy to engage with AI in practical work.'
    when 'riskPosture' then 'Judgement and verification discipline when using AI outputs.'
    when 'capability' then 'Practical fluency and confidence using AI in role-relevant work.'
    else description
  end
where assessment_id = (select id from public.assessments where key = 'ai_readiness_orientation_v1');

drop function if exists public.lq_upgrade_scoring_config_v2(jsonb);
drop function if exists public.lq_classify_score_map(jsonb, jsonb);
drop function if exists public.lq_condition_matches(numeric, text, numeric);
