import { z } from 'zod'

const todayDate = () => new Date().toISOString().split('T')[0]

export const createPersonSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters'),
  dateOfBirth: z
    .string()
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
    .optional()
    .nullable(),
})

export const updatePersonSchema = createPersonSchema.partial()

export type CreatePersonInput = z.infer<typeof createPersonSchema>
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>
