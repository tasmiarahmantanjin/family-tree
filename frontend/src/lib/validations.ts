import { z } from 'zod'

// Allows letters (including Unicode), numbers, spaces, hyphens, apostrophes, and periods
const NAME_PATTERN = /^[\p{L}\p{N}\s'\-.]+$/u

// Allows letters, numbers, spaces, hyphens, apostrophes, periods, and commas
const PLACE_PATTERN = /^[\p{L}\p{N}\s,'\-.]+$/u

const todayDate = () => new Date().toISOString().split('T')[0]

export const createPersonSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters')
    .regex(
      NAME_PATTERN,
      'Name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods',
    ),
  dateOfBirth: z
    .string()
    .min(1, 'Date of birth is required')
    .refine((val) => !Number.isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    })
    .refine(
      (val) => {
        const inputDate = val.split('T')[0]
        return inputDate <= todayDate()
      },
      { message: 'Date of birth cannot be in the future' },
    ),
  placeOfBirth: z
    .string()
    .trim()
    .max(255, 'Place of birth must be less than 255 characters')
    .refine((val) => !val || PLACE_PATTERN.test(val), {
      message:
        'Place can only contain letters, numbers, spaces, commas, hyphens, apostrophes, and periods',
    })
    .optional()
    .nullable(),
})

export const createRelationshipSchema = z
  .object({
    parentId: z.number().int('Parent ID must be an integer').positive('Please select a parent'),
    childId: z.number().int('Child ID must be an integer').positive('Please select a child'),
  })
  .refine(({ parentId, childId }) => parentId !== childId, {
    message: 'A person cannot be their own parent',
    path: ['childId'],
  })

export type CreatePersonInput = z.infer<typeof createPersonSchema>
export type CreateRelationshipInput = z.infer<typeof createRelationshipSchema>
