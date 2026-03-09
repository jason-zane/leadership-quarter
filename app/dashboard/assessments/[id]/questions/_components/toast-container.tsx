import type { Toast } from '../_lib/questions-editor'

export function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={[
            'rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg',
            toast.type === 'success'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              : 'bg-red-600 text-white',
          ].join(' ')}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
