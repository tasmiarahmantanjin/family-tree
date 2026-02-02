import { createPersonSchema, updatePersonSchema } from './person'

describe('Person Schema', () => {
  describe('createPersonSchema', () => {
    it('validates a valid person', () => {
      const validPerson = {
        name: 'John Doe',
        dateOfBirth: '1990-05-15',
        placeOfBirth: 'New York',
      }

      const result = createPersonSchema.safeParse(validPerson)
      expect(result.success).toBe(true)
    })

    it('rejects empty name', () => {
      const invalidPerson = {
        name: '',
        dateOfBirth: '1990-05-15',
      }

      const result = createPersonSchema.safeParse(invalidPerson)
      expect(result.success).toBe(false)
    })

    it('rejects missing dateOfBirth', () => {
      const invalidPerson = {
        name: 'John Doe',
      }

      const result = createPersonSchema.safeParse(invalidPerson)
      expect(result.success).toBe(false)
    })

    it('rejects future date of birth', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const invalidPerson = {
        name: 'Future Person',
        dateOfBirth: tomorrow.toISOString().split('T')[0],
      }

      const result = createPersonSchema.safeParse(invalidPerson)
      expect(result.success).toBe(false)
    })
  })

  describe('updatePersonSchema', () => {
    it('allows partial updates', () => {
      const update = { name: 'Updated Name' }

      const result = updatePersonSchema.safeParse(update)
      expect(result.success).toBe(true)
    })

    it('validates name if provided', () => {
      const invalidUpdate = { name: '' }

      const result = updatePersonSchema.safeParse(invalidUpdate)
      expect(result.success).toBe(false)
    })
  })
})
