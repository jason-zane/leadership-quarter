export {
  DEFAULT_SCALE_CONFIG,
  MAX_EXACT_MATRIX_PREVIEW_COMBINATIONS,
  MAX_EXHAUSTIVE_COVERAGE_COMBINATIONS,
} from '@/utils/assessments/scoring-config/shared'
export {
  createEmptyScoringConfig,
  getBandByScore,
  getDimensionBands,
  isScoringConfigV2,
  normalizeScoringConfig,
} from '@/utils/assessments/scoring-config/normalize'
export {
  analyzeScoringConfig,
  analyzeScoringCoverage,
} from '@/utils/assessments/scoring-config/coverage'
export {
  buildClassificationCombinations,
  buildCombinationPage,
  buildMatrixPreviewRows,
  findClassificationMatrixCell,
  findClassificationOverride,
  getClassificationCombinationCount,
  getDecisionDimensionKeys,
  makeCombinationSignature,
  resolveClassificationCombination,
  type ClassificationResolution,
  type MatrixPreviewRow,
} from '@/utils/assessments/scoring-config/matrix'
export {
  clearGeneratedClassificationMatrixCells,
  generateDraftClassificationMatrix,
  upgradeScoringConfigToV2,
  type MatrixDraftGenerationResult,
  type MatrixDraftGenerationSummary,
} from '@/utils/assessments/scoring-config/draft'
