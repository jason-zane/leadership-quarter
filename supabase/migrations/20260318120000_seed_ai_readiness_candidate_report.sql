do $$
declare
  v_assessment_id uuid;
begin
  select id into v_assessment_id
  from public.assessments
  where key = 'ai_readiness_orientation_v1'
  limit 1;

  if v_assessment_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.v2_assessment_reports
    where assessment_id = v_assessment_id
      and audience_role = 'candidate'
      and report_kind = 'audience'
  ) then
    insert into public.v2_assessment_reports (
      assessment_id,
      name,
      report_kind,
      audience_role,
      status,
      is_default,
      sort_order,
      template_definition
    ) values (
      v_assessment_id,
      'AI Readiness — Candidate Report',
      'audience',
      'candidate',
      'published',
      true,
      0,
      '{
        "version": 1,
        "composition": {
          "version": 1,
          "sections": [
            { "id": "ai_r_overall", "kind": "overall_profile", "title": "Your AI readiness profile", "enabled": true, "layout": "hero_card" },
            { "id": "ai_r_scores", "kind": "score_summary", "title": "Capability overview", "enabled": true, "layer": "dimension", "layout": "score_cards", "max_items": 3 },
            { "id": "ai_r_narrative", "kind": "narrative_insights", "title": "What this means for you", "enabled": true, "layout": "insight_list", "source_override": "derived_outcome", "max_items": 3 },
            { "id": "ai_r_recs", "kind": "recommendations", "title": "Development recommendations", "enabled": true, "layout": "bullet_list", "source_override": "derived_outcome", "max_items": 3 }
          ]
        },
        "blocks": []
      }'::jsonb
    );
  end if;
end $$;
