'use client'

import { AssessmentOpeningPanel, AssessmentPreviewAction } from '@/components/assess/assessment-experience-panels'
import { AssessmentRunner } from '@/components/assess/assessment-runner'
import { CampaignBrandingShell } from '@/components/site/campaign-branding-shell'
import { CampaignRegistrationStep } from '@/components/site/campaign-registration-step'
import { CampaignScreenView } from '@/components/site/campaign-screen-view'
import {
  resolveCampaignBranding,
  type ResolvedCampaignBranding,
} from '@/utils/assessments/campaign-branding'
import type { CampaignJourneyResolvedPage } from '@/utils/assessments/campaign-journey'
import type { CampaignConfig, CampaignFlowStep } from '@/utils/assessments/campaign-types'
import type { RunnerConfig } from '@/utils/assessments/experience-config'
import type { AssessmentExperienceConfig } from '@/utils/assessments/assessment-experience-config'

type Props = {
  campaignName: string
  organisationName?: string | null
  organisationBrandingConfig?: unknown
  campaignConfig: CampaignConfig
  page: CampaignJourneyResolvedPage
  runnerConfig: RunnerConfig
  experienceConfig: AssessmentExperienceConfig
}

function PreviewButton({ label }: { label: string }) {
  return <AssessmentPreviewAction label={label} />
}

function buildPreviewBranding(input: {
  campaignConfig: CampaignConfig
  organisationName?: string | null
  organisationBrandingConfig?: unknown
}): ResolvedCampaignBranding {
  return resolveCampaignBranding({
    config: input.campaignConfig,
    organisation: input.organisationName
      ? {
          name: input.organisationName,
          branding_config: input.organisationBrandingConfig,
        }
      : null,
  })
}

function screenVariant(flowStep: CampaignFlowStep | null | undefined) {
  const style = flowStep?.screen_config.visual_style
  return style === 'transition' ? 'transition' : style === 'minimal' ? 'minimal' : 'standard'
}

export function CampaignJourneyPreview({
  campaignName,
  organisationName,
  organisationBrandingConfig,
  campaignConfig,
  page,
  runnerConfig,
  experienceConfig,
}: Props) {
  const branding = buildPreviewBranding({
    campaignConfig,
    organisationName,
    organisationBrandingConfig,
  })

  return (
    <div className="overflow-hidden rounded-[2rem] border border-[rgba(99,122,150,0.18)] bg-white shadow-[0_28px_80px_rgba(31,41,55,0.08)]">
      <div className="border-b border-[rgba(99,122,150,0.12)] bg-[rgba(243,246,250,0.86)] px-5 py-3 text-xs text-[var(--admin-text-muted)]">
        Participant preview
      </div>
      <div className="site-theme-v1 bg-[var(--site-bg)]">
        <CampaignBrandingShell branding={branding} contentElement="div">
          <div className="assess-container py-8">
            {page.type === 'intro' ? (
              <AssessmentOpeningPanel
                runnerConfig={runnerConfig}
                experienceConfig={{ ...experienceConfig, openingBlocks: page.openingBlocks }}
                title={page.title}
                subtitle={page.description}
                intro={page.eyebrow}
                ctaLabel={page.ctaLabel ?? runnerConfig.start_cta_label}
              />
            ) : null}

            {page.type === 'registration' ? (
              <CampaignRegistrationStep
                campaignConfig={campaignConfig}
                eyebrow={page.eyebrow}
                title={page.title}
                description={page.description}
                submitLabel={page.ctaLabel ?? 'Continue'}
                blocks={page.blocks}
                showIdentityFields
                showDemographicFields={false}
                identityHeading={page.identityHeading}
                identityDescription={page.identityDescription}
                demographicsHeading={page.demographicsHeading}
                demographicsDescription={page.demographicsDescription}
                onSubmitParticipant={async () => Promise.resolve()}
              />
            ) : null}

            {page.type === 'demographics' ? (
              <CampaignRegistrationStep
                campaignConfig={campaignConfig}
                eyebrow={page.eyebrow}
                title={page.title}
                description={page.description}
                submitLabel={page.ctaLabel ?? 'Continue'}
                blocks={page.blocks}
                showIdentityFields={false}
                showDemographicFields
                identityHeading={page.identityHeading}
                identityDescription={page.identityDescription}
                demographicsHeading={page.demographicsHeading}
                demographicsDescription={page.demographicsDescription}
                onSubmitParticipant={async () => Promise.resolve()}
              />
            ) : null}

            {page.type === 'assessment' ? (
              <AssessmentRunner
                assessment={{
                  id: page.assessment?.id ?? 'preview-assessment',
                  key: page.assessment?.id ?? 'preview-assessment',
                  name: page.title,
                  description: page.description,
                }}
                questions={[
                  {
                    id: 'preview-question',
                    question_key: 'preview-question',
                    text: 'I create clarity for others when situations are complex.',
                    dimension: 'Leadership',
                    is_reverse_coded: false,
                    sort_order: 0,
                  },
                ]}
                runnerConfig={runnerConfig}
                runtimeMode="v2"
                v2ExperienceConfig={experienceConfig}
                submitEndpoint="/"
                headerContext={{
                  label: 'Campaign',
                  value: [campaignName, organisationName].filter(Boolean).join(' · '),
                }}
                previewState="question"
                previewQuestion={{
                  index: 3,
                  total: 18,
                  text: 'I create clarity for others when situations are complex.',
                  selectedValue: 4,
                }}
              />
            ) : null}

            {page.type === 'screen' ? (
              <CampaignScreenView
                eyebrow={page.eyebrow}
                title={page.title}
                description={page.description}
                blocks={page.blocks}
                variant={screenVariant(page.flowStep)}
                action={<PreviewButton label={page.ctaLabel ?? 'Continue'} />}
              />
            ) : null}

            {page.type === 'finalising' ? (
              <AssessmentRunner
                assessment={{
                  id: 'preview-assessment',
                  key: 'preview-assessment',
                  name: campaignName,
                  description: '',
                }}
                questions={[
                  {
                    id: 'preview-question',
                    question_key: 'preview-question',
                    text: 'Preview question',
                    dimension: 'Leadership',
                    is_reverse_coded: false,
                    sort_order: 0,
                  },
                ]}
                runnerConfig={runnerConfig}
                runtimeMode="v2"
                v2ExperienceConfig={experienceConfig}
                submitEndpoint="/"
                headerContext={{
                  label: 'Campaign',
                  value: [campaignName, organisationName].filter(Boolean).join(' · '),
                }}
                previewState="finalising"
              />
            ) : null}

            {page.type === 'completion' ? (
              <CampaignScreenView
                eyebrow={page.eyebrow}
                title={page.title}
                description={page.description}
                blocks={page.blocks}
                variant="completion"
                action={<PreviewButton label={page.ctaLabel ?? runnerConfig.completion_screen_cta_label} />}
              />
            ) : null}
          </div>
        </CampaignBrandingShell>
      </div>
    </div>
  )
}
