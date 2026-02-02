'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { relationshipsApi } from '@/lib/api'
import { TREE_QUERY_KEY } from './usePeople'
import type { CreateRelationshipInput } from '@/types'

export const useTree = () => {
  return useQuery({
    queryKey: TREE_QUERY_KEY,
    queryFn: relationshipsApi.getTree,
  })
}

export const useLinkRelationship = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateRelationshipInput) => relationshipsApi.link(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREE_QUERY_KEY })
    },
  })
}

export const useUnlinkRelationship = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateRelationshipInput) => relationshipsApi.unlink(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREE_QUERY_KEY })
    },
  })
}
