'use client'

import type { FormEvent } from 'react'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationInput, FoundationSelect } from '@/components/ui/foundation/field'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import {
  roleOptions,
  type InviteMode,
  type Member,
} from '../_lib/client-detail'

export function InviteMemberCard({
  email,
  role,
  inviteMode,
  busy,
  error,
  inviteWarning,
  setupLink,
  copied,
  onEmailChange,
  onRoleChange,
  onInviteModeChange,
  onSubmit,
  onCopySetupLink,
}: {
  email: string
  role: Member['role']
  inviteMode: InviteMode
  busy: boolean
  error: string | null
  inviteWarning: string | null
  setupLink: string | null
  copied: boolean
  onEmailChange: (value: string) => void
  onRoleChange: (value: Member['role']) => void
  onInviteModeChange: (value: InviteMode) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
  onCopySetupLink: () => Promise<void>
}) {
  return (
    <FoundationSurface className="space-y-4 p-5">
      <h2 className="text-sm font-semibold text-[var(--admin-text-primary)]">Invite member</h2>
      <form
        onSubmit={(event) => {
          void onSubmit(event)
        }}
        className="grid gap-3 md:grid-cols-4"
      >
        <FoundationInput
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="email@client.com"
          type="email"
          required
        />
        <FoundationSelect value={role} onChange={(event) => onRoleChange(event.target.value as Member['role'])}>
          {roleOptions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </FoundationSelect>
        <FoundationSelect
          value={inviteMode}
          onChange={(event) => onInviteModeChange(event.target.value as InviteMode)}
        >
          <option value="auto">Auto (recommended)</option>
          <option value="email">Email only</option>
          <option value="manual_link">Manual setup link</option>
        </FoundationSelect>
        <FoundationButton type="submit" variant="primary" disabled={busy}>
          {busy ? 'Inviting...' : 'Invite'}
        </FoundationButton>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {inviteWarning ? <p className="text-sm text-amber-700">{inviteWarning}</p> : null}
      {setupLink ? (
        <div className="space-y-2 rounded-xl border border-[var(--admin-border)] bg-[rgba(255,255,255,0.72)] p-3">
          <p className="text-xs font-medium text-[var(--admin-text-primary)]">
            Setup link (share manually with this member)
          </p>
          <p className="break-all rounded bg-white p-2 font-mono text-xs text-[var(--admin-text-muted)]">
            {setupLink}
          </p>
          <FoundationButton
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              void onCopySetupLink()
            }}
          >
            {copied ? 'Copied' : 'Copy setup link'}
          </FoundationButton>
        </div>
      ) : null}
    </FoundationSurface>
  )
}
