import { supabaseClient } from "@/lib/supabaseClient"
import { toApiError } from "../lib/requestErrors"
import type { StatusHistoryEntry } from "../requests.types"

const HISTORY_COLUMNS =
  "id, request_id, from_status, to_status, actor_id, note, created_at"

/** RLS already scopes this to history on a request the caller may see. */
export async function listStatusHistoryApi(
  requestId: string
): Promise<StatusHistoryEntry[]> {
  const { data, error } = await supabaseClient
    .from("request_status_history")
    .select(HISTORY_COLUMNS)
    .eq("request_id", requestId)
    .order("created_at", { ascending: true })

  if (error) throw toApiError(error)
  return data
}
