import type { ScoringDimension } from '@/utils/assessments/types'
import { AddItemForm } from './add-item-form'
import { DescriptionEditor } from './description-editor'
import { InlineLabelEditor } from './inline-label-editor'
import { QuestionRow } from './question-row'
import type { AddToast, Question } from '../_lib/questions-editor'

export function ConstructSection({
  dimension,
  questions,
  allQuestions,
  assessmentId,
  onQuestionUpdated,
  onQuestionDeleted,
  onQuestionAdded,
  onMoveQuestion,
  onSaveLabel,
  onSaveDescription,
  onDelete,
  addToast,
}: {
  dimension: ScoringDimension
  questions: Question[]
  allQuestions: Question[]
  assessmentId: string
  onQuestionUpdated: (question: Question) => void
  onQuestionDeleted: (id: string) => void
  onQuestionAdded: (question: Question) => void
  onMoveQuestion: (fromIndex: number, direction: 'up' | 'down') => Promise<void>
  onSaveLabel: (label: string) => Promise<void>
  onSaveDescription: (description: string) => Promise<void>
  onDelete: () => Promise<void>
  addToast: AddToast
}) {
  const itemCount = questions.length
  const hasQuestions = itemCount > 0

  return (
    <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <InlineLabelEditor label={dimension.label} onSave={onSaveLabel} />
              <span className="font-mono text-xs text-zinc-400">{dimension.key}</span>
              <span className="text-xs text-zinc-400">
                {itemCount} item{itemCount !== 1 ? 's' : ''}
              </span>
              {itemCount < 3 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  3+ recommended
                </span>
              )}
            </div>
            <DescriptionEditor description={dimension.description} onSave={onSaveDescription} />
          </div>
          <button
            onClick={() => {
              void onDelete()
            }}
            disabled={hasQuestions}
            title={hasQuestions ? 'Remove all questions before deleting' : 'Delete construct'}
            className="mt-0.5 shrink-0 text-zinc-300 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-600 dark:hover:text-red-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="py-1">
        {questions.map((question, index) => (
          <QuestionRow
            key={question.id}
            question={question}
            index={index}
            isFirst={index === 0}
            isLast={index === questions.length - 1}
            assessmentId={assessmentId}
            onUpdated={onQuestionUpdated}
            onDeleted={onQuestionDeleted}
            onMoveUp={() => onMoveQuestion(index, 'up')}
            onMoveDown={() => onMoveQuestion(index, 'down')}
            addToast={addToast}
          />
        ))}
        {itemCount === 0 && <p className="px-4 py-2 text-xs italic text-zinc-400">No items yet.</p>}
      </div>

      <div className="border-t border-zinc-100 py-2 dark:border-zinc-800">
        <AddItemForm
          dimensionKey={dimension.key}
          assessmentId={assessmentId}
          questions={allQuestions}
          onAdded={onQuestionAdded}
          addToast={addToast}
        />
      </div>
    </section>
  )
}
