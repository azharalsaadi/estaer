import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { APIError } from "@/types/api.types"
import { createItemApi, type CreateItemPayload } from "../apis/items.api"
import type { ItemRow } from "../catalog.types"

export const useCreateItem = () => {
  const queryClient = useQueryClient()

  return useMutation<ItemRow, APIError, CreateItemPayload>({
    mutationFn: createItemApi,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["items"] })
    },
  })
}
