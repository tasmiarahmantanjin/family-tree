import { createRelationshipSchema } from './relationship'

describe('Relationship Schema', () => {
  it('validates valid relationship', () => {
    const result = createRelationshipSchema.safeParse({ parentId: 1, childId: 2 })
    expect(result.success).toBe(true)
  })

  it('rejects non-integer IDs', () => {
    const result = createRelationshipSchema.safeParse({ parentId: 1.5, childId: 2 })
    expect(result.success).toBe(false)
  })

  it('rejects missing fields', () => {
    const result = createRelationshipSchema.safeParse({ parentId: 1 })
    expect(result.success).toBe(false)
  })
})
