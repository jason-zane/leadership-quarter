// ---------------------------------------------------------------------------
// Auto-register all placeholder block renderers
// ---------------------------------------------------------------------------

import { registerBlockRenderer } from '@/utils/reports/assessment-report-block-registry'
import { ReportPreviewBlock, ReportHeaderBlock, ReportCtaBlock } from './report-preview-block'

// Every valid source:format combination gets the placeholder for now.
// As real renderers are built, replace each entry here.

const REGISTRATIONS: Array<[string, string]> = [
  // overall_classification
  ['overall_classification', 'hero_card'],
  ['overall_classification', 'rich_text'],

  // derived_outcome
  ['derived_outcome', 'hero_card'],
  ['derived_outcome', 'rich_text'],
  ['derived_outcome', 'band_cards'],

  // layer_profile
  ['layer_profile', 'score_cards'],
  ['layer_profile', 'bar_chart'],
  ['layer_profile', 'score_table'],
  ['layer_profile', 'band_cards'],
  ['layer_profile', 'bipolar_bar'],

  // dimension_scores
  ['dimension_scores', 'score_cards'],
  ['dimension_scores', 'bar_chart'],
  ['dimension_scores', 'score_table'],
  ['dimension_scores', 'band_cards'],
  ['dimension_scores', 'bipolar_bar'],

  // competency_scores
  ['competency_scores', 'score_cards'],
  ['competency_scores', 'bar_chart'],
  ['competency_scores', 'score_table'],
  ['competency_scores', 'band_cards'],
  ['competency_scores', 'bipolar_bar'],

  // trait_scores
  ['trait_scores', 'score_cards'],
  ['trait_scores', 'bar_chart'],
  ['trait_scores', 'score_table'],
  ['trait_scores', 'band_cards'],
  ['trait_scores', 'bipolar_bar'],

  // legacy interpretations
  ['interpretations', 'insight_list'],
  ['interpretations', 'band_cards'],
  ['interpretations', 'rich_text'],

  // recommendations
  ['recommendations', 'bullet_list'],
  ['recommendations', 'insight_list'],

  // static_content
  ['static_content', 'rich_text'],
]

let registered = false

export function ensureBlocksRegistered() {
  if (registered) return
  for (const [source, format] of REGISTRATIONS) {
    registerBlockRenderer(source, format, ReportPreviewBlock)
  }
  registerBlockRenderer('report_header', 'hero_card', ReportHeaderBlock)
  registerBlockRenderer('report_cta', 'rich_text', ReportCtaBlock)
  registered = true
}
