'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { peopleApi } from '@/lib/api'
import type { CreatePersonInput } from '@/types'

const PEOPLE_QUERY_KEY = ['people'] as const
export const TREE_QUERY_KEY = ['tree'] as const

export const useCreatePerson = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreatePersonInput) => peopleApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PEOPLE_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: TREE_QUERY_KEY })
    },
  })
}

export const useUpdatePerson = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreatePersonInput> }) =>
      peopleApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PEOPLE_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: TREE_QUERY_KEY })
    },
  })
}

export const useDeletePerson = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => peopleApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PEOPLE_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: TREE_QUERY_KEY })
    },
  })
}
