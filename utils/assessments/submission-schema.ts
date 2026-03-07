import { z } from 'zod'

export const InvitationSubmitSchema = z.object({
  responses: z.record(
    z.string(),
    z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
  ),
})

export type InvitationSubmitPayload = z.infer<typeof InvitationSubmitSchema>
