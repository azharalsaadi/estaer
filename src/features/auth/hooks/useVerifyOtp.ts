import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { APIError } from "@/types/api.types"
import { verifyOtpApi, type VerifyOtpPayload } from "../apis/auth.api"
import { AUTH_SESSION_QUERY_KEY } from "../auth.constants"
import type { AuthUser } from "../auth.types"

export const useVerifyOtp = () => {
  const queryClient = useQueryClient()

  return useMutation<AuthUser, APIError, VerifyOtpPayload>({
    mutationFn: verifyOtpApi,
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_SESSION_QUERY_KEY, user)
    },
  })
}
