import { z } from 'zod'

export const createRelationshipSchema = z.object({
  parentId: z.number().int('Parent ID must be an integer').positive('Parent ID must be positive'),
  childId: z.number().int('Child ID must be an integer').positive('Child ID must be positive'),
})

export type CreateRelationshipInput = z.infer<typeof createRelationshipSchema>
