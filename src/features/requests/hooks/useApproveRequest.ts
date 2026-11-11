import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { APIError } from "@/types/api.types"
import { approveRequestApi } from "../apis/requests.api"

export const useApproveRequest = () => {
  const queryClient = useQueryClient()

  return useMutation<void, APIError, string>({
    mutationFn: approveRequestApi,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["requests"] })
      void queryClient.invalidateQueries({ queryKey: ["items", "availability"] })
      void queryClient.invalidateQueries({ queryKey: ["items", "booked-ranges"] })
    },
  })
}
