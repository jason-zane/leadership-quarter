import { z } from 'zod'

const LikertResponseSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
])

const DemographicValueSchema = z.union([z.string(), z.array(z.string())])

export const InvitationSubmitSchema = z.object({
  responses: z.record(z.string(), LikertResponseSchema),
  isFinalAssessment: z.boolean().optional(),
  demographics: z.record(z.string(), DemographicValueSchema).optional(),
})

export type InvitationSubmitPayload = z.infer<typeof InvitationSubmitSchema>

export const CampaignSubmitSchema = z.object({
  assessmentId: z.string().optional(),
  isFinalAssessment: z.boolean().optional(),
  responses: z.record(z.string(), LikertResponseSchema),
  consent: z.boolean().optional(),
  participant: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    organisation: z.string().optional(),
    role: z.string().optional(),
  }).optional(),
  demographics: z.record(z.string(), DemographicValueSchema).optional(),
})

export type CampaignSubmitPayload = z.infer<typeof CampaignSubmitSchema>
