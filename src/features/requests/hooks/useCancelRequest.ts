import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { APIError } from "@/types/api.types"
import { cancelRequestApi } from "../apis/requests.api"

export const useCancelRequest = () => {
  const queryClient = useQueryClient()

  return useMutation<void, APIError, string>({
    mutationFn: cancelRequestApi,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["requests"] })
      void queryClient.invalidateQueries({ queryKey: ["items", "availability"] })
      void queryClient.invalidateQueries({ queryKey: ["items", "booked-ranges"] })
    },
  })
}
