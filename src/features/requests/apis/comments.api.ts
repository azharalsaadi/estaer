import { supabaseClient } from "@/lib/supabaseClient"
import type { APIError } from "@/types/api.types"
import { toApiError } from "../lib/requestErrors"
import type { Comment } from "../requests.types"

const COMMENT_COLUMNS = "id, request_id, author_id, body, created_at"

/** RLS already scopes this to comments on a request the caller may see
 * (their own, or any request if admin). */
export async function listCommentsApi(requestId: string): Promise<Comment[]> {
  const { data, error } = await supabaseClient
    .from("comments")
    .select(COMMENT_COLUMNS)
    .eq("request_id", requestId)
    .order("created_at", { ascending: true })

  if (error) throw toApiError(error)
  return data
}

export type CreateCommentPayload = {
  request_id: string
  body: string
}

export async function createCommentApi({
  request_id,
  body,
}: CreateCommentPayload): Promise<Comment> {
  const { data: authData, error: authError } = await supabaseClient.auth.getUser()
  if (authError) throw toApiError(authError)
  if (!authData.user) {
    throw { code: "AUTH_REQUIRED", message: "No authenticated user" } satisfies APIError
  }

  const { data, error } = await supabaseClient
    .from("comments")
    .insert({ request_id, body, author_id: authData.user.id })
    .select(COMMENT_COLUMNS)
    .single()

  if (error) throw toApiError(error)
  return data
}
