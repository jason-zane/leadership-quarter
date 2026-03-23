'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAutoSave } from '@/components/dashboard/hooks/use-auto-save'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import {
  type DemographicFieldKey,
  type DemographicsPosition,
  type RegistrationPosition,
  type ReportAccess,
} from '@/utils/assessments/campaign-types'
import { CampaignDangerZone } from '../_components/campaign-danger-zone'
import { CampaignSettingsForm } from '../_components/campaign-settings-form'
import {
  normalizeCampaignSlug,
  type Campaign,
  type Organisation,
} from '../_lib/campaign-overview'

type CampaignResponse = {
  campaign?: Campaign
}

type OrganisationsResponse = {
  organisations?: Organisation[]
}

type MutationResponse = {
  ok?: boolean
  error?: string
}

function buildSnapshot(input: {
  name: string
  externalName: string
  description: string
  orgId: string
  registrationPosition: RegistrationPosition
  reportAccess: ReportAccess
  demographicsEnabled: boolean
  demographicsPosition: DemographicsPosition
  demographicsFields: DemographicFieldKey[]
  invitationDemographicsEnabled: boolean
  entryLimit: string
}) {
  return { ...input }
}

export default function CampaignSettingsPage() {
  const params = useParams<{ id: string }>()
  const campaignId = params.id

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [loading, setLoading] = useState(true)

  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [externalName, setExternalName] = useState('')
  const [description, setDescription] = useState('')
  const [orgId, setOrgId] = useState('')
  const [registrationPosition, setRegistrationPosition] = useState<RegistrationPosition>('before')
  const [reportAccess, setReportAccess] = useState<ReportAccess>('immediate')
  const [reportOptions, setReportOptions] = useState<Array<{ id: string; name: string; assessmentName: string }>>([])
  const [selectedReportId, setSelectedReportId] = useState('')
  const [demographicsEnabled, setDemographicsEnabled] = useState(false)
  const [demographicsPosition, setDemographicsPosition] = useState<DemographicsPosition>('after')
  const [demographicsFields, setDemographicsFields] = useState<DemographicFieldKey[]>([])
  const [invitationDemographicsEnabled, setInvitationDemographicsEnabled] = useState(false)
  const [entryLimit, setEntryLimit] = useState('')

  const configSnapshot = useMemo(
    () =>
      buildSnapshot({
        name,
        externalName,
        description,
        orgId,
        registrationPosition,
        reportAccess,
        demographicsEnabled,
        demographicsPosition,
        demographicsFields,
        invitationDemographicsEnabled,
        entryLimit,
      }),
    [
      demographicsEnabled, demographicsFields, demographicsPosition, invitationDemographicsEnabled,
      description, entryLimit, externalName, name, orgId,
      registrationPosition, reportAccess,
    ]
  )

  const hydrateForm = useCallback((c: Campaign) => {
    setName(c.name)
    setExternalName(c.external_name)
    setDescription(c.description ?? '')
    setOrgId(c.organisation_id ?? '')
    setRegistrationPosition(c.config.registration_position)
    setReportAccess(c.config.report_access)
    setDemographicsEnabled(c.config.demographics_enabled)
    setDemographicsPosition(c.config.demographics_position)
    setDemographicsFields(c.config.demographics_fields ?? [])
    setInvitationDemographicsEnabled(c.config.invitation_demographics_enabled ?? false)
    setEntryLimit(c.config.entry_limit ? String(c.config.entry_limit) : '')
  }, [])

  const validate = useCallback((data: ReturnType<typeof buildSnapshot>) => {
    const slug = normalizeCampaignSlug(data.externalName)
    if (!slug) return 'External name must include letters or numbers so we can generate a public URL.'
    return null
  }, [])

  const onSave = useCallback(async (data: ReturnType<typeof buildSnapshot>) => {
    const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name.trim(),
        external_name: data.externalName.trim(),
        description: data.description.trim() || null,
        organisation_id: data.orgId || null,
        config: {
          registration_position: data.registrationPosition,
          report_access: data.reportAccess,
          demographics_enabled: data.demographicsEnabled,
          demographics_position: data.demographicsPosition,
          demographics_fields: data.demographicsEnabled ? data.demographicsFields : [],
          invitation_demographics_enabled: data.demographicsEnabled && data.invitationDemographicsEnabled,
          entry_limit: Number.isFinite(Number(data.entryLimit)) && Number(data.entryLimit) >= 1 ? Math.floor(Number(data.entryLimit)) : null,
        },
      }),
    })
    const body = (await response.json().catch(() => null)) as MutationResponse | null
    if (!response.ok || !body?.ok) {
      if (body?.error === 'slug_taken') throw new Error('That slug is already in use for this campaign scope.')
      if (body?.error === 'invalid_slug') throw new Error('Slug must contain only lowercase letters, numbers, and dashes.')
      throw new Error(body?.error ?? 'Failed to save campaign configuration.')
    }
  }, [campaignId])

  const { status: autoSaveStatus, error: autoSaveError, savedAt: autoSaveSavedAt, saveNow, markSaved: markConfigSaved } = useAutoSave({
    data: configSnapshot,
    onSave,
    validate,
    saveOn: 'blur',
  })

  const applyCampaignState = useCallback((c: Campaign | null) => {
    setCampaign(c)
    if (!c) return
    hydrateForm(c)
    markConfigSaved(
      buildSnapshot({
        name: c.name,
        externalName: c.external_name,
        description: c.description ?? '',
        orgId: c.organisation_id ?? '',
        registrationPosition: c.config.registration_position,
        reportAccess: c.config.report_access,
        demographicsEnabled: c.config.demographics_enabled,
        demographicsPosition: c.config.demographics_position,
        demographicsFields: c.config.demographics_fields ?? [],
        invitationDemographicsEnabled: c.config.invitation_demographics_enabled ?? false,
        entryLimit: c.config.entry_limit ? String(c.config.entry_limit) : '',
      })
    )
  }, [hydrateForm, markConfigSaved])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const [campaignRes, orgsRes] = await Promise.all([
        fetch(`/api/admin/campaigns/${campaignId}`, { cache: 'no-store' }),
        fetch('/api/admin/organisations?pageSize=200', { cache: 'no-store' }),
      ])
      const campaignBody = (await campaignRes.json()) as CampaignResponse
      const orgsBody = (await orgsRes.json().catch(() => null)) as OrganisationsResponse | null
      if (!active) return
      applyCampaignState(campaignBody.campaign ?? null)
      setOrganisations(orgsBody?.organisations ?? [])

      const activeAssessments = (campaignBody.campaign?.campaign_assessments ?? []).filter((ca) => ca.is_active && ca.assessments)
      const reportResults = await Promise.all(
        activeAssessments.map(async (ca) => {
          const res = await fetch(`/api/admin/assessments/${ca.assessment_id}/reports`, { cache: 'no-store' })
          const body = (await res.json().catch(() => null)) as {
            ok?: boolean
            reports?: Array<{ id: string; name: string; reportKind: string; status: string }>
          } | null
          if (!res.ok || !body?.ok) return []
          return (body.reports ?? [])
            .filter((r) => r.reportKind === 'audience' && r.status === 'published')
            .map((r) => ({
              id: r.id,
              name: r.name,
              assessmentName: ca.assessments?.external_name ?? ca.assessments?.name ?? 'Assessment',
            }))
        })
      )
      if (!active) return
      setReportOptions(reportResults.flat())

      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [applyCampaignState, campaignId])

  function toggleDemographicsField(field: string) {
    setDemographicsFields((prev) =>
      prev.includes(field as DemographicFieldKey)
        ? prev.filter((item) => item !== field)
        : [...prev, field as DemographicFieldKey]
    )
  }

  async function deleteCampaign() {
    if (!campaign || deleteConfirmName !== campaign.name) return
    setDeleting(true)
    setDeleteError(null)
    const response = await fetch(`/api/admin/campaigns/${campaignId}`, { method: 'DELETE' })
    const body = (await response.json().catch(() => null)) as MutationResponse | null
    setDeleting(false)
    if (!response.ok) {
      if (body?.error === 'campaign_has_activity') {
        setDeleteError('Campaigns with invitations or submissions cannot be deleted. Archive or close this one instead.')
        return
      }
      setDeleteError('Failed to delete campaign.')
      return
    }
    window.location.href = '/dashboard/campaigns'
  }

  const publicSlug =
    normalizeCampaignSlug(externalName)
    || (campaign ? normalizeCampaignSlug(campaign.external_name) : '')
    || campaign?.slug
    || ''

  if (loading) {
    return <p className="text-sm text-zinc-400">Loading...</p>
  }

  if (!campaign) {
    return <p className="text-sm text-red-500">Campaign not found.</p>
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Campaign settings"
        title={campaign.name}
        description="Configure campaign identity, audience rules, and access controls."
      />

      <CampaignSettingsForm
        name={name}
        externalName={externalName}
        description={description}
        slug={publicSlug}
        orgId={orgId}
        organisations={organisations}
        registrationPosition={registrationPosition}
        reportAccess={reportAccess}
        reportOptions={reportOptions}
        selectedReportId={selectedReportId}
        demographicsEnabled={demographicsEnabled}
        demographicsPosition={demographicsPosition}
        demographicsFields={demographicsFields}
        invitationDemographicsEnabled={invitationDemographicsEnabled}
        entryLimit={entryLimit}
        autoSaveStatus={autoSaveStatus}
        autoSaveError={autoSaveError}
        autoSaveSavedAt={autoSaveSavedAt}
        onSaveNow={() => void saveNow()}
        onRetrySave={() => void saveNow()}
        onNameChange={setName}
        onExternalNameChange={setExternalName}
        onDescriptionChange={setDescription}
        onOrgIdChange={(value) => { setOrgId(value); void saveNow() }}
        onRegistrationPositionChange={(value) => { setRegistrationPosition(value); void saveNow() }}
        onReportAccessChange={setReportAccess}
        onReportChange={setSelectedReportId}
        onDemographicsEnabledChange={(value) => { setDemographicsEnabled(value); void saveNow() }}
        onDemographicsPositionChange={(value) => { setDemographicsPosition(value); void saveNow() }}
        onInvitationDemographicsEnabledChange={(value) => { setInvitationDemographicsEnabled(value); void saveNow() }}
        onEntryLimitChange={setEntryLimit}
        onToggleDemographicsField={(field) => { toggleDemographicsField(field); void saveNow() }}
      />

      {campaign.status === 'archived' ? (
        <CampaignDangerZone
          campaignName={campaign.name}
          showDeleteConfirm={showDeleteConfirm}
          deleteConfirmName={deleteConfirmName}
          deleting={deleting}
          deleteError={deleteError}
          onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
          onDeleteConfirmNameChange={setDeleteConfirmName}
          onDelete={deleteCampaign}
          onCancel={() => {
            setShowDeleteConfirm(false)
            setDeleteConfirmName('')
          }}
        />
      ) : null}
    </DashboardPageShell>
  )
}
