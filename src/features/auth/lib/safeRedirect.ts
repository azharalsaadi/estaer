/**
 * Validates a user-controlled `redirect` search param so it can only ever
 * point somewhere inside this app — never to an external host. The portal
 * layout each path leads to still independently re-checks auth/role on
 * its own (see router/protected.routes.tsx); this only prevents an open
 * redirect, it is not itself an authorization check.
 */
export function toSafeRedirectPath(
  candidate: string | undefined,
  fallback: string
): string {
  if (!candidate) return fallback
  if (!candidate.startsWith("/")) return fallback
  if (candidate.startsWith("//")) return fallback
  if (candidate.includes("://") || candidate.includes("\\")) return fallback
  return candidate
}

/** "/admin" for an admin, "/member" for a member — the landing page for a
 * normal sign-in with no requested destination. */
export function getRoleHomePath(role: "member" | "admin"): string {
  return role === "admin" ? "/admin" : "/member"
}

/**
 * Where to land after verifying the OTP: the originally-requested page,
 * but only "when the user's role permits it" — a member's `redirect`
 * pointing into `/admin/*` is ignored in favor of their role home, rather
 * than sending them there and letting the route guard bounce them to
 * `/access-denied` a moment later. An admin may still land on a
 * `/member/*` destination (admins retain member abilities). This is
 * UX only: the actual access decision is still made independently by
 * the route guards regardless of what this function returns.
 */
export function resolvePostLoginDestination(
  candidate: string | undefined,
  role: "member" | "admin"
): string {
  const roleHome = getRoleHomePath(role)
  const safePath = toSafeRedirectPath(candidate, roleHome)

  if (role !== "admin" && safePath.startsWith("/admin")) {
    return roleHome
  }

  return safePath
}
