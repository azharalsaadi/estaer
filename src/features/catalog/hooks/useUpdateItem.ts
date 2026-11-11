import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { APIError } from "@/types/api.types"
import { updateItemApi, type UpdateItemPayload } from "../apis/items.api"
import type { ItemRow } from "../catalog.types"

export const useUpdateItem = () => {
  const queryClient = useQueryClient()

  return useMutation<ItemRow, APIError, UpdateItemPayload>({
    mutationFn: updateItemApi,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["items"] })
    },
  })
}
