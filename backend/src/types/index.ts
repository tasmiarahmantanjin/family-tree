export interface PersonAttributes {
  id?: number
  name: string
  dateOfBirth: Date
  placeOfBirth?: string | null
  createdAt?: Date
  updatedAt?: Date
}

export interface ParentChildAttributes {
  id?: number
  parentId: number
  childId: number
  createdAt?: Date
}

export interface PersonWithRelations extends PersonAttributes {
  parents?: PersonAttributes[]
}

export interface TreePerson {
  id: number
  name: string
  dateOfBirth: string
  placeOfBirth?: string | null
  parents: { id: number }[]
  generationLevel: number
  ancestorIds: number[]
  descendantIds: number[]
}

export const MIN_PARENT_AGE_DIFF_YEARS = 15
export const MAX_PARENTS_PER_CHILD = 2

export const calculateAgeDiffYears = (parentDob: Date, childDob: Date): number => {
  const ageDiffMs = childDob.getTime() - parentDob.getTime()
  return ageDiffMs / (1000 * 60 * 60 * 24 * 365.25)
}

export interface ApiSuccessResponse<T> {
  data: T
}

export interface ApiErrorResponse {
  error: string
  details?: string[]
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export const StatusCode = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const
