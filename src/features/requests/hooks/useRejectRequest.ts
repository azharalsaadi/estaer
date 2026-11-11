import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { APIError } from "@/types/api.types"
import { rejectRequestApi } from "../apis/requests.api"

export const useRejectRequest = () => {
  const queryClient = useQueryClient()

  return useMutation<void, APIError, { requestId: string; reason: string }>({
    mutationFn: ({ requestId, reason }) => rejectRequestApi(requestId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["requests"] })
      void queryClient.invalidateQueries({ queryKey: ["items", "availability"] })
      void queryClient.invalidateQueries({ queryKey: ["items", "booked-ranges"] })
    },
  })
}
