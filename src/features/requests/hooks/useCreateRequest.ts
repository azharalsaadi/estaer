import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { APIError } from "@/types/api.types"
import { createRequestApi, type CreateRequestPayload } from "../apis/requests.api"

export const useCreateRequest = () => {
  const queryClient = useQueryClient()

  return useMutation<void, APIError, CreateRequestPayload>({
    mutationFn: createRequestApi,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["requests"] })
      void queryClient.invalidateQueries({ queryKey: ["items", "availability"] })
      void queryClient.invalidateQueries({ queryKey: ["items", "booked-ranges"] })
    },
  })
}
