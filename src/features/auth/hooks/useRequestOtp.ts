import { useMutation } from "@tanstack/react-query"
import type { APIError } from "@/types/api.types"
import { requestOtpApi, type RequestOtpPayload } from "../apis/auth.api"

export const useRequestOtp = () => {
  return useMutation<void, APIError, RequestOtpPayload>({
    mutationFn: requestOtpApi,
  })
}
