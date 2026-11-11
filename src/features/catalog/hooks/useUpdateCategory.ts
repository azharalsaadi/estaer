import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { APIError } from "@/types/api.types"
import { updateCategoryApi, type UpdateCategoryPayload } from "../apis/categories.api"
import type { Category } from "../catalog.types"

export const useUpdateCategory = () => {
  const queryClient = useQueryClient()

  return useMutation<Category, APIError, UpdateCategoryPayload>({
    mutationFn: updateCategoryApi,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["categories"] })
      // Deactivating a category must hide its items from member browsing.
      void queryClient.invalidateQueries({ queryKey: ["items"] })
    },
  })
}
