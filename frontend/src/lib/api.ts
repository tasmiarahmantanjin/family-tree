import axios from 'axios'
import { apiClient } from './axios'
import type {
  Person,
  ParentChild,
  CreatePersonInput,
  CreateRelationshipInput,
  ApiSuccessResponse,
  ApiErrorResponse,
} from '@/types'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly details?: string[],
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const request = async <T>(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  payload?: unknown,
): Promise<T> => {
  try {
    const response = await apiClient.request<ApiSuccessResponse<T>>({
      method,
      url,
      data: payload,
    })

    if (response.status === 204) {
      return undefined as T
    }

    return response.data.data
  } catch (error: unknown) {
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
      const status = error.response?.status
      const errorData = error.response?.data

      throw new ApiError(
        errorData?.error ?? error.message ?? 'Unexpected API error',
        status,
        errorData?.details,
      )
    }

    throw new ApiError(error instanceof Error ? error.message : 'Unknown error occurred')
  }
}

export const peopleApi = {
  getAll: () => request<Person[]>('get', '/people'),

  create: (input: CreatePersonInput) => request<Person>('post', '/people', input),

  update: (id: number, input: Partial<CreatePersonInput>) =>
    request<Person>('put', `/people/${id}`, input),

  delete: (id: number) => request<void>('delete', `/people/${id}`),
}

export const relationshipsApi = {
  link: (input: CreateRelationshipInput) =>
    request<ParentChild>('post', '/relationships/link', input),
  unlink: (input: CreateRelationshipInput) => request<void>('post', '/relationships/unlink', input),
  getTree: () => request<Person[]>('get', '/relationships/tree'),
}
