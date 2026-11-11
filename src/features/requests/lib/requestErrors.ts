import { PostgrestError } from "@supabase/supabase-js"
import type { APIError, ApiErrorCode } from "@/types/api.types"

/**
 * create_request()/update_request_status()/cancel_request()
 * (0006_requests_functions.sql) each raise with a short literal message
 * (e.g. "ITEM_ALREADY_RESERVED") that doubles as the stable code — there
 * is no separate sqlstate-to-meaning table to maintain.
 */
const KNOWN_RPC_CODES: ApiErrorCode[] = [
  "AUTH_REQUIRED",
  "INVALID_DATE_RANGE",
  "START_DATE_IN_PAST",
  "INVALID_REASON",
  "ITEM_NOT_AVAILABLE",
  "ITEM_ALREADY_RESERVED",
  "INVALID_TRANSITION",
  "REJECTION_REASON_REQUIRED",
  "REQUEST_NOT_FOUND",
  "FORBIDDEN",
]

export function toApiError(error: unknown): APIError {
  if (error instanceof TypeError) {
    return { code: "NETWORK_ERROR", message: error.message }
  }

  if (error instanceof PostgrestError) {
    const matched = KNOWN_RPC_CODES.find((code) => code === error.message)
    if (matched) return { code: matched, message: error.message }
    // 23505 (unique_violation) and 23P01 (exclusion_violation, from the
    // date-range overlap constraint — 0012_date_range_overlap.sql)
    // should both already be caught and re-raised as the clear
    // "ITEM_ALREADY_RESERVED" message inside create_request() itself;
    // these are a defensive fallback for a raw constraint error reaching
    // the client on any path that didn't go through that handling.
    if (error.code === "23505" || error.code === "23P01")
      return { code: "ITEM_ALREADY_RESERVED", message: error.message }
    if (error.code === "42501") return { code: "FORBIDDEN", message: error.message }
    // Diagnostic only — see the identical note in catalog's toApiError.
    console.error("[requests] unmapped Postgrest error", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    return { code: "UNKNOWN", message: error.message }
  }

  if (error instanceof Error) {
    console.error("[requests] unmapped error", error)
    return { code: "UNKNOWN", message: error.message }
  }

  return { code: "UNKNOWN", message: "Unknown error" }
}
