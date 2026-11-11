import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { APIError } from "@/types/api.types"
import { signOutApi } from "../apis/auth.api"

/**
 * Clears the ENTIRE query cache on success, not just the auth query — any
 * user-scoped data (requests, profile, etc.) must not survive a sign-out
 * or be visible to whoever signs in next on this device.
 */
export const useSignOut = () => {
  const queryClient = useQueryClient()

  return useMutation<void, APIError, void>({
    mutationFn: signOutApi,
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
