import type { ReactNode } from 'react'
import type { OrgBrandingConfig } from '@/utils/brand/org-brand-utils'
import { buildBrandCssOverrides } from '@/utils/brand/org-brand-utils'

type Props = {
  brandingConfig?: OrgBrandingConfig | null
  cssOverrides?: string | null
  children: ReactNode
}

export function BrandAwarePreviewShell({ brandingConfig, cssOverrides, children }: Props) {
  const resolvedOverrides = cssOverrides
    ?? (brandingConfig ? buildBrandCssOverrides(brandingConfig) : '')

  return (
    <div className="site-theme-v1 bg-[var(--site-bg)]">
      {resolvedOverrides ? (
        <style dangerouslySetInnerHTML={{ __html: `.site-theme-v1 { ${resolvedOverrides} }` }} />
      ) : null}
      {children}
    </div>
  )
}
