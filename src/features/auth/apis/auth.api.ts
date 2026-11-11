import { PostgrestError, isAuthError } from "@supabase/supabase-js"
import { supabaseClient } from "@/lib/supabaseClient"
import type { APIError } from "@/types/api.types"
import type { AuthUser } from "../auth.types"

/**
 * Part of the isolated access layer (see docs/STRUCTURE.md). This is the
 * only file, besides lib/supabaseClient.ts itself, allowed to import the
 * Supabase SDK. Everything it exports is an application-owned type or a
 * normalized APIError — no Supabase session/user/error object ever
 * crosses out of this file.
 */

// Must match the message set in supabase/migrations/0004_auth_provisioning.sql's
// hook_restrict_employee_signup(). There is no stable error `code` for an
// Auth Hook rejection (unlike built-in errors such as `otp_expired`), so
// this is a deliberate, documented best effort — revisit if Supabase adds
// one.
const EMPLOYEE_NOT_APPROVED_MESSAGE =
  "This email is not registered as an approved employee."

function toApiError(error: unknown): APIError {
  // fetch() rejects with a plain TypeError on a genuine network failure
  // (offline/DNS/CORS) — before any HTTP response, so before this ever
  // becomes an AuthError or PostgrestError.
  if (error instanceof TypeError) {
    return { code: "NETWORK_ERROR", message: error.message }
  }

  if (isAuthError(error)) {
    if (error.status === 403 && error.message.includes(EMPLOYEE_NOT_APPROVED_MESSAGE)) {
      return { code: "NOT_APPROVED_EMPLOYEE", message: error.message }
    }
    if (error.code === "otp_expired") {
      return { code: "OTP_INVALID_OR_EXPIRED", message: error.message }
    }
    if (
      error.code === "over_email_send_rate_limit" ||
      error.code === "over_request_rate_limit"
    ) {
      return { code: "RATE_LIMITED", message: error.message }
    }
    return { code: "UNKNOWN", message: error.message }
  }

  if (error instanceof PostgrestError) {
    return { code: "UNKNOWN", message: error.message }
  }

  return { code: "UNKNOWN", message: "Unknown error" }
}

async function fetchProfile(userId: string): Promise<AuthUser> {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("email, role")
    .eq("user_id", userId)
    .single()

  if (error) throw toApiError(error)

  return { id: userId, email: data.email, role: data.role }
}

export type RequestOtpPayload = {
  email: string
}

export async function requestOtpApi({ email }: RequestOtpPayload): Promise<void> {
  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })
  if (error) throw toApiError(error)
}

export type VerifyOtpPayload = {
  email: string
  token: string
}

export async function verifyOtpApi({
  email,
  token,
}: VerifyOtpPayload): Promise<AuthUser> {
  const { data, error } = await supabaseClient.auth.verifyOtp({
    email,
    token,
    type: "email",
  })
  if (error) throw toApiError(error)
  if (!data.user) {
    throw { code: "UNKNOWN", message: "verifyOtp returned no user" } satisfies APIError
  }

  return fetchProfile(data.user.id)
}

export async function getSessionUserApi(): Promise<AuthUser | null> {
  const { data, error } = await supabaseClient.auth.getSession()
  if (error) throw toApiError(error)
  if (!data.session) return null

  return fetchProfile(data.session.user.id)
}

/**
 * Returns an unsubscribe function — call it on cleanup.
 *
 * Fires on sign-in, sign-out, token refresh, AND on storage events from
 * other tabs/windows of the SAME browser profile signing in as a
 * different identity (Supabase's GoTrue client syncs sessions across
 * tabs by design). A background re-fetch failure here (e.g. a transient
 * network blip during a token refresh) must NOT be treated as a sign-out
 * — only an explicit `session === null` (an actual sign-out/expiry) does
 * that. Treating any fetch error as "signed out" previously caused
 * spurious redirects away from the current portal.
 */
export function subscribeToAuthChangesApi(
  onChange: (user: AuthUser | null) => void
): () => void {
  const { data } = supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      onChange(null)
      return
    }
    fetchProfile(session.user.id)
      .then(onChange)
      .catch((error: unknown) => {
        // Diagnostic only — no user data beyond a Postgrest/Auth error code.
        console.error(
          "[auth] background session refresh failed; keeping previous state",
          error
        )
      })
  })

  return () => data.subscription.unsubscribe()
}

export async function signOutApi(): Promise<void> {
  const { error } = await supabaseClient.auth.signOut()
  if (error) throw toApiError(error)
}
