import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { APIError } from "@/types/api.types"
import { uploadItemImageApi } from "../apis/items.api"

type UploadItemImageInput = {
  itemId: string
  file: File
  previousImagePath?: string | null
}

export const useUploadItemImage = () => {
  const queryClient = useQueryClient()

  return useMutation<string, APIError, UploadItemImageInput>({
    mutationFn: ({ itemId, file, previousImagePath }) =>
      uploadItemImageApi(itemId, file, previousImagePath),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["items"] })
    },
  })
}
