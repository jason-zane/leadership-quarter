import { AssessmentPreviewAction } from '@/components/assess/assessment-experience-panels'
import { CampaignBrandingShell } from '@/components/site/campaign-branding-shell'
import {
  resolveCampaignBranding,
  resolveOrganisationBrandingPreview,
} from '@/utils/assessments/campaign-branding'
import type { CampaignConfig } from '@/utils/assessments/campaign-types'
import type { OrgBrandingConfig } from '@/utils/brand/org-brand-utils'

type SharedProps = {
  organisationName?: string | null
  className?: string
  title?: string
  description?: string
}

type CampaignSpecimenProps = SharedProps & {
  campaignConfig: CampaignConfig
  organisationBrandingConfig?: unknown
  platformBrand?: OrgBrandingConfig | null
  brandingConfig?: never
}

type OrganisationSpecimenProps = SharedProps & {
  brandingConfig: OrgBrandingConfig
  campaignConfig?: never
  organisationBrandingConfig?: never
}

type Props = CampaignSpecimenProps | OrganisationSpecimenProps

export function CampaignBrandingSpecimen(props: Props) {
  const {
    organisationName,
    className,
    title = 'Participant preview',
    description = 'The hero gradient, calmer support surfaces, CTA buttons, and progress treatment all come from the same brand theme.',
  } = props

  const branding = 'brandingConfig' in props
    ? resolveOrganisationBrandingPreview({
        organisation: {
          name: organisationName,
          branding_config: props.brandingConfig,
        },
      })
    : resolveCampaignBranding({
        config: props.campaignConfig,
        organisation: organisationName
          ? {
              name: organisationName,
              branding_config: props.organisationBrandingConfig,
            }
          : null,
        platformBrand: props.platformBrand,
      })

  return (
    <div
      className={[
        'overflow-hidden rounded-[1.8rem] border border-[rgba(103,127,159,0.16)] bg-white shadow-[0_28px_72px_rgba(21,31,49,0.08)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="border-b border-[rgba(103,127,159,0.12)] bg-[rgba(246,248,252,0.82)] px-5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-text-soft)]">
          Participant look and feel
        </p>
      </div>

      <div className="site-theme-v1 bg-[var(--site-bg)]">
        <CampaignBrandingShell branding={branding} contentElement="div">
          <div className="assess-container py-6">
            <div className="grid gap-4">
              <section
                className="overflow-hidden rounded-[2rem] border px-6 py-6 shadow-[0_28px_72px_rgba(18,28,43,0.18)] md:px-7 md:py-7"
                style={{
                  borderColor: 'var(--site-panel-hero-border)',
                  background: 'var(--site-panel-hero-bg)',
                }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--site-panel-hero-muted)]">
                  {title}
                </p>
                <h2 className="mt-3 font-serif text-[clamp(1.8rem,4vw,2.7rem)] leading-[1.02] text-[var(--site-panel-hero-text)]">
                  Leadership experience with your campaign brand applied cleanly.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--site-panel-hero-muted)]">
                  {description}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <AssessmentPreviewAction label="Start assessment" />
                  <AssessmentPreviewAction label="Secondary action" secondary />
                </div>
              </section>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
                <section className="site-card-sub p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--site-text-muted)]">
                    Standard surface
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--site-text-primary)]">
                    Calmer cards stay readable while still carrying the canvas tint.
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">
                    Support panels, forms, and quieter participant moments should stay calm even when the hero and CTAs are more expressive.
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-[1.1rem] border border-[var(--site-panel-card-border)] bg-[var(--site-field-bg)] px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--site-text-muted)]">Form field</p>
                      <p className="mt-2 text-sm text-[var(--site-text-primary)]">Your role</p>
                    </div>
                    <div className="rounded-[1.1rem] border border-[var(--site-button-secondary-border)] bg-[var(--site-button-secondary-bg)] px-4 py-3 text-sm text-[var(--site-button-secondary-text)]">
                      Secondary action surface
                    </div>
                  </div>
                </section>

                <section className="rounded-[1.5rem] border border-[var(--site-panel-callout-border)] bg-[var(--site-panel-callout-bg)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--site-text-muted)]">
                    Accent treatment
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-[var(--site-text-primary)]">
                    Secondary colour should show up in highlights, softer panels, and progress finishes.
                  </h3>
                  <div className="mt-4 rounded-[1rem] bg-[var(--site-status-bg)] px-4 py-3 text-sm text-[var(--site-status-text)]">
                    Participant progress summary
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-[var(--site-progress-track)]">
                    <div className="h-full w-[62%] rounded-full bg-[var(--site-progress-fill)]" />
                  </div>
                </section>
              </div>

              <div className="grid gap-3 md:grid-cols-5">
                <Swatch label="Hero start" background="var(--site-bg)" inset="var(--site-brand-hero-start)" />
                <Swatch label="Hero end" background="var(--site-bg)" inset="var(--site-brand-hero-end)" />
                <Swatch label="Canvas" background="var(--site-bg)" inset="var(--site-brand-canvas)" border="var(--site-panel-card-border)" />
                <Swatch label="Primary CTA" background="var(--site-bg)" inset="var(--site-brand-primary-cta)" />
                <Swatch label="Secondary CTA" background="var(--site-bg)" inset="var(--site-brand-secondary-cta)" />
              </div>
            </div>
          </div>
        </CampaignBrandingShell>
      </div>
    </div>
  )
}

function Swatch({
  label,
  background,
  inset,
  border = 'rgba(15,23,42,0.08)',
}: {
  label: string
  background: string
  inset: string
  border?: string
}) {
  return (
    <section className="site-card-sub p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--site-text-muted)]">{label}</p>
      <div className="mt-3 flex h-16 items-center rounded-[1rem] border px-3" style={{ background, borderColor: 'var(--site-panel-card-border)' }}>
        <div
          className="h-full w-full rounded-[0.85rem] border"
          style={{
            background: inset,
            borderColor: border,
          }}
        />
      </div>
    </section>
  )
}
