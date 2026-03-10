import {
  DEMOGRAPHIC_FIELD_CATALOG,
  DEMOGRAPHIC_FIELD_SECTIONS,
} from '@/utils/assessments/campaign-types'

export function DemographicsFieldSelector({
  selectedFields,
  onToggleField,
}: {
  selectedFields: string[]
  onToggleField: (field: string) => void
}) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Demographics fields
      </p>
      <div className="space-y-4">
        {DEMOGRAPHIC_FIELD_SECTIONS.map((section) => {
          const fields = DEMOGRAPHIC_FIELD_CATALOG.filter((field) => field.section === section.key)
          if (fields.length === 0) return null

          return (
            <div key={section.key} className="space-y-2">
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{section.label}</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {fields.map((field) => (
                  <label
                    key={field.key}
                    className="flex items-start gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-200"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.key)}
                      onChange={() => onToggleField(field.key)}
                      className="mt-0.5 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">
                        {field.label}
                        {'sensitive' in field && field.sensitive ? (
                          <span className="ml-2 text-[11px] uppercase tracking-wide text-amber-600">Sensitive</span>
                        ) : null}
                      </span>
                      <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                        {field.inputType === 'multiselect'
                          ? 'Multiple choice'
                          : field.inputType === 'select'
                            ? 'Single choice'
                            : 'Short text'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
