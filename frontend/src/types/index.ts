export interface Person {
  id: number
  name: string
  dateOfBirth: string
  placeOfBirth?: string | null
  createdAt?: string
  updatedAt?: string
  parents?: { id: number }[]
  generationLevel: number
  ancestorIds: number[]
  descendantIds: number[]
}

export interface ParentChild {
  id: number
  parentId: number
  childId: number
  createdAt: string
  parent?: Person
  child?: Person
}

export interface CreatePersonInput {
  name: string
  dateOfBirth: string
  placeOfBirth?: string
}

export interface CreateRelationshipInput {
  parentId: number
  childId: number
}

export interface ApiSuccessResponse<T> {
  data: T
}

export interface ApiErrorResponse {
  error: string
  details?: string[]
}

export const MIN_PARENT_AGE_DIFF_YEARS = 15
