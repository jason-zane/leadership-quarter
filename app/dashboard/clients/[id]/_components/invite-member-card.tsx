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
  inviteEmail,
  inviteRole,
  inviteMode,
  inviteBusy,
  inviteError,
  attachEmail,
  attachRole,
  attachBusy,
  attachError,
  inviteWarning,
  setupLink,
  copied,
  clientLoginUrl,
  clientLoginCopied,
  onInviteEmailChange,
  onInviteRoleChange,
  onInviteModeChange,
  onAttachEmailChange,
  onAttachRoleChange,
  onInviteSubmit,
  onAttachSubmit,
  onCopySetupLink,
  onCopyClientLoginUrl,
}: {
  inviteEmail: string
  inviteRole: Member['role']
  inviteMode: InviteMode
  inviteBusy: boolean
  inviteError: string | null
  attachEmail: string
  attachRole: Member['role']
  attachBusy: boolean
  attachError: string | null
  inviteWarning: string | null
  setupLink: string | null
  copied: boolean
  clientLoginUrl: string
  clientLoginCopied: boolean
  onInviteEmailChange: (value: string) => void
  onInviteRoleChange: (value: Member['role']) => void
  onInviteModeChange: (value: InviteMode) => void
  onAttachEmailChange: (value: string) => void
  onAttachRoleChange: (value: Member['role']) => void
  onInviteSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
  onAttachSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
  onCopySetupLink: () => Promise<void>
  onCopyClientLoginUrl: () => Promise<void>
}) {
  return (
    <FoundationSurface className="space-y-4 p-5">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-[var(--admin-text-primary)]">
          Add portal member
        </h2>
        <p className="text-sm text-[var(--admin-text-muted)]">
          Invite a brand-new client user, or attach an existing backend/auth user for immediate
          access.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-[var(--admin-border)] bg-[rgba(255,255,255,0.58)] p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">
            Invite a new client user
          </h3>
          <p className="text-xs text-[var(--admin-text-muted)]">
            Creates a new account and sends an email or setup link.
          </p>
        </div>
        <form
          onSubmit={(event) => {
            void onInviteSubmit(event)
          }}
          className="grid gap-3 md:grid-cols-4"
        >
          <FoundationInput
            value={inviteEmail}
            onChange={(event) => onInviteEmailChange(event.target.value)}
            placeholder="email@client.com"
            type="email"
            required
          />
          <FoundationSelect
            value={inviteRole}
            onChange={(event) => onInviteRoleChange(event.target.value as Member['role'])}
          >
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
          <FoundationButton type="submit" variant="primary" disabled={inviteBusy}>
            {inviteBusy ? 'Inviting...' : 'Invite'}
          </FoundationButton>
        </form>
        {inviteError ? <p className="text-sm text-red-600">{inviteError}</p> : null}
        {inviteWarning ? <p className="text-sm text-amber-700">{inviteWarning}</p> : null}
      </div>

      <div className="space-y-3 rounded-xl border border-[var(--admin-border)] bg-[rgba(255,255,255,0.58)] p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">
            Attach an existing user
          </h3>
          <p className="text-xs text-[var(--admin-text-muted)]">
            Use this for an existing Leadership Quarter admin, staff user, or any auth account.
            Access becomes active immediately.
          </p>
        </div>
        <form
          onSubmit={(event) => {
            void onAttachSubmit(event)
          }}
          className="grid gap-3 md:grid-cols-3"
        >
          <FoundationInput
            value={attachEmail}
            onChange={(event) => onAttachEmailChange(event.target.value)}
            placeholder="existing.user@client.com"
            type="email"
            required
          />
          <FoundationSelect
            value={attachRole}
            onChange={(event) => onAttachRoleChange(event.target.value as Member['role'])}
          >
            {roleOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </FoundationSelect>
          <FoundationButton type="submit" variant="secondary" disabled={attachBusy}>
            {attachBusy ? 'Attaching...' : 'Attach existing'}
          </FoundationButton>
        </form>
        {attachError ? <p className="text-sm text-red-600">{attachError}</p> : null}
      </div>

      <div className="space-y-2 rounded-xl border border-[var(--admin-border)] bg-[rgba(255,255,255,0.72)] p-3">
        <p className="text-xs font-medium text-[var(--admin-text-primary)]">
          Client login URL
        </p>
        <p className="break-all rounded bg-white p-2 font-mono text-xs text-[var(--admin-text-muted)]">
          {clientLoginUrl}
        </p>
        <FoundationButton
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            void onCopyClientLoginUrl()
          }}
        >
          {clientLoginCopied ? 'Copied' : 'Copy login URL'}
        </FoundationButton>
      </div>
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
