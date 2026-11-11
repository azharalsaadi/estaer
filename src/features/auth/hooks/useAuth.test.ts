import { describe, expect, it } from "vitest"
import { AUTH_SESSION_QUERY_OPTIONS } from "./useAuth"
import { AUTH_SESSION_QUERY_KEY } from "../auth.constants"

/**
 * Regression guard for the bug where the router guard
 * (router/protected.routes.tsx) called `ensureQueryData` with its own
 * inline { queryKey, queryFn } instead of this shared options object,
 * silently dropping `staleTime: Infinity` and refetching the session/role
 * on every navigation. As long as both call sites import this SAME
 * object, that class of drift can't happen again.
 */
describe("AUTH_SESSION_QUERY_OPTIONS", () => {
  it("uses the shared auth session query key", () => {
    expect(AUTH_SESSION_QUERY_OPTIONS.queryKey).toBe(AUTH_SESSION_QUERY_KEY)
  })

  it("never considers the cached session stale on its own", () => {
    expect(AUTH_SESSION_QUERY_OPTIONS.staleTime).toBe(Infinity)
  })
})
