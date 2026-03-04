'use client'

import { useEffect, useState } from 'react'

type Organisation = {
  id: string
  name: string
  slug: string
}

export function PortalOrgSwitcher({
  currentOrganisationId,
}: {
  currentOrganisationId: string
}) {
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [selectedId, setSelectedId] = useState(currentOrganisationId)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      const res = await fetch('/api/portal/admin/organisations', { cache: 'no-store' })
      const body = (await res.json()) as { organisations?: Organisation[] }
      if (!active) return
      setOrganisations(body.organisations ?? [])
    })()
    return () => {
      active = false
    }
  }, [])

  async function updateContext(orgId: string) {
    setSelectedId(orgId)
    setSaving(true)
    await fetch('/api/portal/admin/context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organisation_id: orgId }),
    })
    window.location.reload()
  }

  return (
    <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
      <span>Organisation</span>
      <select
        value={selectedId}
        onChange={(e) => void updateContext(e.target.value)}
        disabled={saving}
        className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      >
        {organisations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
    </label>
  )
}
