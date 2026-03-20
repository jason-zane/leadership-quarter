'use client'

import { useRef, useState } from 'react'
import type { OrgBrandingConfig } from '@/utils/brand/org-brand-utils'
import { validateHexColor } from '@/utils/brand/org-brand-utils'

type Props = {
  organisationId: string
  initialBranding: OrgBrandingConfig
}

export function OrgBrandingCard({ organisationId, initialBranding }: Props) {
  const [brandingEnabled, setBrandingEnabled] = useState(initialBranding.branding_enabled)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialBranding.logo_url)
  const [logoPreview, setLogoPreview] = useState<string | null>(initialBranding.logo_url)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [primaryColor, setPrimaryColor] = useState(initialBranding.primary_color ?? '')
  const [secondaryColor, setSecondaryColor] = useState(initialBranding.secondary_color ?? '')
  const [companyName, setCompanyName] = useState(initialBranding.company_name ?? '')
  const [showAttribution, setShowAttribution] = useState(initialBranding.show_lq_attribution)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    setPendingFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function handleRemoveLogo() {
    setPendingFile(null)
    setLogoPreview(null)
    setLogoUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSave() {
    const trimmedPrimary = primaryColor.trim()
    const trimmedSecondary = secondaryColor.trim()

    if (trimmedPrimary && !validateHexColor(trimmedPrimary)) {
      setError('Primary colour must be a valid hex value (e.g. #1a3a6b).')
      return
    }
    if (trimmedSecondary && !validateHexColor(trimmedSecondary)) {
      setError('Secondary colour must be a valid hex value (e.g. #d9b46d).')
      return
    }

    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      let resolvedLogoUrl = logoUrl

      if (pendingFile) {
        const fd = new FormData()
        fd.append('file', pendingFile)
        const uploadRes = await fetch(`/api/admin/organisations/${organisationId}/assets`, {
          method: 'POST',
          body: fd,
        })
        const uploadBody = (await uploadRes.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null
        if (!uploadRes.ok || !uploadBody?.ok || !uploadBody.url) {
          throw new Error(uploadBody?.error ?? 'Logo upload failed.')
        }
        resolvedLogoUrl = uploadBody.url
        setLogoUrl(resolvedLogoUrl)
        setPendingFile(null)
      }

      const patch: Partial<OrgBrandingConfig> = {
        branding_enabled: brandingEnabled,
        logo_url: resolvedLogoUrl,
        primary_color: trimmedPrimary || null,
        secondary_color: trimmedSecondary || null,
        company_name: companyName.trim() || null,
        show_lq_attribution: showAttribution,
      }

      const res = await fetch(`/api/admin/organisations/${organisationId}/branding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branding_config: patch }),
      })
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error ?? 'Branding update failed.')
      }

      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--dashboard-border,#e2e8f0)] bg-white p-6">
      <h2 className="text-base font-semibold text-[var(--dashboard-text-primary,#1a2a3d)]">
        Branding
      </h2>
      <p className="mt-1 text-sm text-[var(--dashboard-text-muted,#64748b)]">
        Customise how this client's assessment pages appear to their participants.
      </p>

      <div className="mt-6 grid gap-5">
        {/* Enable toggle */}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--dashboard-border,#e2e8f0)] p-4">
          <div className="mt-0.5 flex-shrink-0">
            <input
              type="checkbox"
              checked={brandingEnabled}
              onChange={(e) => setBrandingEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--dashboard-border,#e2e8f0)]"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--dashboard-text-primary,#1a2a3d)]">
              Use custom branding for this client's assessments
            </p>
            <p className="mt-0.5 text-sm text-[var(--dashboard-text-muted,#64748b)]">
              When enabled, the logo, colours, and name below will be applied to all assessment pages for this organisation.
            </p>
          </div>
        </label>

        {/* Logo */}
        <div>
          <p className="mb-2 text-sm font-medium text-[var(--dashboard-text-primary,#1a2a3d)]">
            Logo
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {logoPreview ? (
              <div className="flex h-16 w-40 items-center justify-center rounded-xl border border-[var(--dashboard-border,#e2e8f0)] bg-[#f8f8f8] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoPreview} alt="Logo preview" className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div className="flex h-16 w-40 items-center justify-center rounded-xl border border-dashed border-[var(--dashboard-border,#e2e8f0)] bg-[#f8f8f8]">
                <span className="text-xs text-[var(--dashboard-text-muted,#64748b)]">No logo</span>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-[var(--dashboard-border,#e2e8f0)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--dashboard-text-primary,#1a2a3d)] hover:bg-[#f8fafc] transition-colors"
              >
                {logoPreview ? 'Replace' : 'Upload logo'}
              </button>
              {logoPreview && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="rounded-lg border border-[var(--dashboard-border,#e2e8f0)] bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/svg+xml,image/webp,image/jpeg"
            className="hidden"
            onChange={handleFileChange}
          />
          <p className="mt-1.5 text-xs text-[var(--dashboard-text-muted,#64748b)]">
            PNG, SVG, or WebP. Max 2 MB.
          </p>
        </div>

        {/* Colours */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-[var(--dashboard-text-primary,#1a2a3d)]">
              Primary colour
            </span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor || '#2f5f99'}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-lg border border-[var(--dashboard-border,#e2e8f0)] p-0.5"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#2f5f99"
                className="flex-1 rounded-lg border border-[var(--dashboard-border,#e2e8f0)] px-3 py-2 text-sm font-mono"
              />
            </div>
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-[var(--dashboard-text-primary,#1a2a3d)]">
              Secondary colour
              <span className="ml-1 font-normal text-[var(--dashboard-text-muted,#64748b)]">(optional)</span>
            </span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secondaryColor || '#d9b46d'}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-lg border border-[var(--dashboard-border,#e2e8f0)] p-0.5"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                placeholder="#d9b46d"
                className="flex-1 rounded-lg border border-[var(--dashboard-border,#e2e8f0)] px-3 py-2 text-sm font-mono"
              />
            </div>
          </label>
        </div>

        {/* Company name override */}
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-[var(--dashboard-text-primary,#1a2a3d)]">
            Name shown to participants
            <span className="ml-1 font-normal text-[var(--dashboard-text-muted,#64748b)]">(optional)</span>
          </span>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Defaults to organisation name"
            className="rounded-lg border border-[var(--dashboard-border,#e2e8f0)] px-3 py-2 text-sm"
          />
        </label>

        {/* LQ attribution */}
        <label className="flex items-start gap-2.5 text-sm text-[var(--dashboard-text-primary,#1a2a3d)]">
          <input
            type="checkbox"
            checked={showAttribution}
            onChange={(e) => setShowAttribution(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[var(--dashboard-border,#e2e8f0)]"
          />
          <span>
            Show "Powered by Leadership Quarter" on assessment pages
          </span>
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {saved && !error && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Branding saved.</p>
        )}

        <div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-[#1a2a3d] px-5 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save branding'}
          </button>
        </div>
      </div>
    </section>
  )
}
