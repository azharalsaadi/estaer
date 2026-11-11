import { Outlet, createRoute, redirect } from "@tanstack/react-router"
import { AdminShell } from "@/components/layout/AdminShell"
import { MemberShell } from "@/components/layout/MemberShell"
import { AUTH_SESSION_QUERY_OPTIONS } from "@/features/auth/hooks/useAuth"
import { rootRoute } from "./root.route"

/**
 * The one shared authentication boundary (REQUIREMENTS.md §9) — every
 * protected page goes through exactly one of these two `beforeLoad`
 * checks, never its own copy of this logic.
 *
 * `ensureQueryData(AUTH_SESSION_QUERY_OPTIONS)` uses the EXACT SAME query
 * key, fetcher, and `staleTime: Infinity` that `useAuth()` uses — sharing
 * the one options object (rather than duplicating the key+fn here) is
 * deliberate: without an explicit `staleTime` matching useAuth's, this
 * call would use the QueryClient's default (0) and silently refetch the
 * session/role from the server on every navigation, including the one
 * that closes a dialog after a save. That redundant fetch is exactly the
 * kind of thing that can race and momentarily miscompute the role. Since
 * both the cache priming here and the cache reading in useAuth() already
 * share the key, the page component that eventually mounts never
 * re-fetches either. The router shows `defaultPendingComponent` while
 * this resolves, so protected content never mounts before the check
 * completes.
 *
 * The role check here is for ROUTING/UX only. It reads a value that was
 * itself fetched from `profiles` through RLS (trusted, server-enforced) —
 * it is not the actual security boundary. Real data access is still
 * enforced by RLS on every table regardless of what this guard decides.
 */
export const memberLayoutRoute = createRoute({
  id: "member-layout",
  getParentRoute: () => rootRoute,
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.ensureQueryData(AUTH_SESSION_QUERY_OPTIONS)

    // The bare member home ("/member") is the public landing page — a
    // signed-out visitor is allowed through to it (member-home.page.tsx
    // itself renders the guest view: zeroed stats, no personal data, a
    // "Sign in" action). Every OTHER member route still requires a
    // session, exactly as before.
    const isPublicMemberHome = location.pathname === "/member"

    if (!user && !isPublicMemberHome) {
      // redirect() returns a Response, not an Error — this is TanStack
      // Router's documented throw-to-redirect pattern, not a mistake.
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/login", search: { redirect: location.href } })
    }
  },
  component: () => (
    <MemberShell>
      <Outlet />
    </MemberShell>
  ),
})

export const adminLayoutRoute = createRoute({
  id: "admin-layout",
  getParentRoute: () => rootRoute,
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.ensureQueryData(AUTH_SESSION_QUERY_OPTIONS)

    if (!user) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- see note above
      throw redirect({ to: "/admin/login", search: { redirect: location.href } })
    }

    if (user.role !== "admin") {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- see note above
      throw redirect({ to: "/access-denied" })
    }
  },
  component: () => (
    <AdminShell>
      <Outlet />
    </AdminShell>
  ),
})
