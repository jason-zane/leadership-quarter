export type Toast = { id: number; message: string; type: 'success' | 'error' }

export type MatrixStatusFilter = 'all' | 'manual' | 'generated' | 'unmapped'

export type Question = {
  id: string
  question_key: string
  text: string
  dimension: string
  is_reverse_coded: boolean
  sort_order: number
  is_active: boolean
}
