import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { getSessionUserApi, subscribeToAuthChangesApi } from "../apis/auth.api"
import { AUTH_SESSION_QUERY_KEY } from "../auth.constants"

/**
 * Shared between this hook and the router guard
 * (router/protected.routes.tsx's `beforeLoad`, via `ensureQueryData`).
 *
 * `staleTime` is a PER-CALL option, not something owned by the query key
 * globally — React Query merges each caller's own options with the
 * QueryClient's defaults (which do not set a staleTime, so the library
 * default of 0 applies). A previous version only set `staleTime: Infinity`
 * on this hook's own `useQuery`; the router guard's separate
 * `ensureQueryData` call had no override, so it silently refetched the
 * session + role from the server on EVERY navigation inside a protected
 * layout — including, e.g., the navigation that closes the equipment
 * dialog after a save. That redundant fetch raced against normal network
 * variance and could momentarily miscompute the role, bouncing an admin
 * out. Exporting one shared options object for both call sites removes
 * the class of bug, not just this one instance of it.
 */
export const AUTH_SESSION_QUERY_OPTIONS = {
  queryKey: AUTH_SESSION_QUERY_KEY,
  queryFn: getSessionUserApi,
  staleTime: Infinity,
} as const

/**
 * The single source of session/role truth for the whole app. The router's
 * auth guard primes this same query key via `queryClient.ensureQueryData`
 * in `beforeLoad` (using AUTH_SESSION_QUERY_OPTIONS above), so by the time
 * any page using this hook mounts, the data is already in cache — this
 * hook does not duplicate that fetch.
 *
 * The only authoritative updates after that come from
 * `subscribeToAuthChangesApi`'s push (sign-in, sign-out, token refresh,
 * revoked session) via `setQueryData` below — not from React Query's own
 * refetch heuristics.
 */
export const useAuth = () => {
  const queryClient = useQueryClient()

  const { data: user, isLoading } = useQuery(AUTH_SESSION_QUERY_OPTIONS)

  useEffect(() => {
    const unsubscribe = subscribeToAuthChangesApi((nextUser) => {
      queryClient.setQueryData(AUTH_SESSION_QUERY_KEY, nextUser)
    })
    return unsubscribe
  }, [queryClient])

  return {
    user: user ?? null,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    isLoading,
  }
}
