/** Resource-first query key — see docs/STRUCTURE.md naming conventions. */
export const AUTH_SESSION_QUERY_KEY = ["auth", "session"] as const

/**
 * Supabase allows one OTP request per email every 60 seconds (documented
 * platform rate limit). Mirrored here only to drive the resend-cooldown
 * countdown in the UI — the real limit is enforced server-side regardless.
 */
export const OTP_RESEND_COOLDOWN_SECONDS = 60
