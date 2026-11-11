import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { APIError } from "@/types/api.types"
import { returnRequestApi } from "../apis/requests.api"

export const useReturnRequest = () => {
  const queryClient = useQueryClient()

  return useMutation<void, APIError, string>({
    mutationFn: returnRequestApi,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["requests"] })
      void queryClient.invalidateQueries({ queryKey: ["items", "availability"] })
      void queryClient.invalidateQueries({ queryKey: ["items", "booked-ranges"] })
    },
  })
}
