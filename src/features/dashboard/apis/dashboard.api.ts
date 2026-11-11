import { PostgrestError } from "@supabase/supabase-js"
import { supabaseClient } from "@/lib/supabaseClient"
import type { APIError } from "@/types/api.types"
import { isOverdue, isOnLoan, businessToday } from "@/features/requests/lib/dates"

function toApiError(error: unknown): APIError {
  if (error instanceof TypeError) return { code: "NETWORK_ERROR", message: error.message }
  if (error instanceof PostgrestError) return { code: "UNKNOWN", message: error.message }
  return { code: "UNKNOWN", message: "Unknown error" }
}

export type DashboardStats = {
  pending: number
  onLoan: number
  overdue: number
}

/**
 * RLS already scopes `requests` to the caller's own rows for a member and
 * to everyone's for an admin — this ONE function serves both portals
 * (REQUIREMENTS.md §19 requires the exact same definition in both).
 */
export async function getDashboardStatsApi(): Promise<DashboardStats> {
  const { data, error } = await supabaseClient
    .from("requests")
    .select("status, start_date, end_date")
    .in("status", ["pending", "approved"])

  if (error) throw toApiError(error)

  const today = businessToday()
  let pending = 0
  let onLoan = 0
  let overdue = 0

  for (const request of data) {
    if (request.status === "pending") {
      pending += 1
    } else if (request.status === "approved") {
      if (isOnLoan(request.status, request.start_date, today)) onLoan += 1
      if (isOverdue(request.status, request.end_date, today)) overdue += 1
    }
  }

  return { pending, onLoan, overdue }
}
