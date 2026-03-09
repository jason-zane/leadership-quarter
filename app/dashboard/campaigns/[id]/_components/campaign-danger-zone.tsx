export function CampaignDangerZone({
  campaignName,
  showDeleteConfirm,
  deleteConfirmName,
  deleting,
  deleteError,
  onShowDeleteConfirm,
  onDeleteConfirmNameChange,
  onDelete,
  onCancel,
}: {
  campaignName: string
  showDeleteConfirm: boolean
  deleteConfirmName: string
  deleting: boolean
  deleteError: string | null
  onShowDeleteConfirm: () => void
  onDeleteConfirmNameChange: (value: string) => void
  onDelete: () => Promise<void>
  onCancel: () => void
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-white dark:border-red-900/40 dark:bg-zinc-900">
      <div className="px-5 py-4">
        <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Danger zone</h2>
      </div>
      <div className="border-t border-red-100 px-5 py-4 dark:border-red-900/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Delete campaign</p>
            <p className="text-xs text-zinc-500">
              Permanently delete this campaign and all its data. This cannot be undone.
            </p>
          </div>
          {!showDeleteConfirm && (
            <button
              onClick={onShowDeleteConfirm}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Delete
            </button>
          )}
        </div>

        {showDeleteConfirm && (
          <div className="mt-3 space-y-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/10">
            <p className="text-xs font-medium text-red-700 dark:text-red-400">
              Type <span className="font-mono">{campaignName}</span> to confirm deletion
            </p>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(event) => onDeleteConfirmNameChange(event.target.value)}
              placeholder={campaignName}
              className="w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm dark:border-red-800 dark:bg-zinc-900"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  void onDelete()
                }}
                disabled={deleting || deleteConfirmName !== campaignName}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Permanently delete'}
              </button>
              <button
                onClick={onCancel}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
            {deleteError ? <p className="text-sm text-red-600">{deleteError}</p> : null}
          </div>
        )}
      </div>
    </div>
  )
}
