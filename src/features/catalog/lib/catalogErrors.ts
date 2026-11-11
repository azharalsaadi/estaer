import { PostgrestError } from "@supabase/supabase-js"
import type { APIError } from "@/types/api.types"

/**
 * Postgres auto-names an unnamed column `unique` constraint
 * `<table>_<column>_key` — that name appears verbatim in the error
 * message for a 23505 (unique_violation), so matching on it tells us
 * which field actually collided.
 */
export function toApiError(error: unknown): APIError {
  if (error instanceof TypeError) {
    return { code: "NETWORK_ERROR", message: error.message }
  }

  if (error instanceof PostgrestError) {
    if (error.code === "23505") {
      if (error.message.includes("items_serial_number_key")) {
        return { code: "DUPLICATE_SERIAL_NUMBER", message: error.message }
      }
      if (error.message.includes("categories_name_key")) {
        return { code: "DUPLICATE_CATEGORY_NAME", message: error.message }
      }
    }
    if (error.code === "42501") {
      return { code: "FORBIDDEN", message: error.message }
    }
    // Diagnostic only — the UI never renders error.message, only the
    // mapped `code` (via serverErrors.<code>). Logging the real Postgrest
    // code/message/hint here is what makes an unmapped failure (like a
    // schema/RLS issue on a live project) actually diagnosable from the
    // browser console instead of a silent generic error.
    console.error("[catalog] unmapped Postgrest error", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    return { code: "UNKNOWN", message: error.message }
  }

  // Storage errors (image upload) are a different Error subclass than
  // PostgrestError — not matched above, but still worth keeping the real
  // message for diagnostics even though the UI only ever shows the
  // generic fallback for an unmapped code.
  if (error instanceof Error) {
    console.error("[catalog] unmapped error", error)
    return { code: "UNKNOWN", message: error.message }
  }

  return { code: "UNKNOWN", message: "Unknown error" }
}
