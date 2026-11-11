import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { APIError } from "@/types/api.types"
import { createCategoryApi, type CreateCategoryPayload } from "../apis/categories.api"
import type { Category } from "../catalog.types"

export const useCreateCategory = () => {
  const queryClient = useQueryClient()

  return useMutation<Category, APIError, CreateCategoryPayload>({
    mutationFn: createCategoryApi,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["categories"] })
      // A new category can never already have items, but deactivating one
      // on the same screen later does affect item visibility — keep both
      // resources invalidated together for consistency.
      void queryClient.invalidateQueries({ queryKey: ["items"] })
    },
  })
}
