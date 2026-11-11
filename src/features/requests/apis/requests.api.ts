import { supabaseClient } from "@/lib/supabaseClient"
import { toApiError } from "../lib/requestErrors"
import type { Request, RequestStatus } from "../requests.types"

const REQUEST_COLUMNS =
  "id, user_id, item_id, start_date, end_date, reason, status, created_at, updated_at"

type RawRequest = {
  id: string
  user_id: string
  item_id: string
  start_date: string
  end_date: string
  reason: string
  status: RequestStatus
  created_at: string
  updated_at: string
}

type RawItem = { id: string; name: string; serial_number: string; category_id: string }

async function fetchItemsByIds(itemIds: string[]): Promise<Map<string, RawItem>> {
  if (itemIds.length === 0) return new Map()
  const { data, error } = await supabaseClient
    .from("items")
    .select("id, name, serial_number, category_id")
    .in("id", itemIds)
  if (error) throw toApiError(error)
  return new Map(data.map((item) => [item.id, item]))
}

async function fetchCategoryNamesByIds(
  categoryIds: string[]
): Promise<Map<string, string>> {
  if (categoryIds.length === 0) return new Map()
  const { data, error } = await supabaseClient
    .from("categories")
    .select("id, name")
    .in("id", categoryIds)
  if (error) throw toApiError(error)
  return new Map(data.map((category) => [category.id, category.name]))
}

async function fetchEmailsByUserIds(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map()
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("user_id, email")
    .in("user_id", userIds)
  // Not fatal: a member calling this (never should, but defensively) just
  // gets no borrower emails back rather than a broken request list.
  if (error) return new Map()
  return new Map(data.map((profile) => [profile.user_id, profile.email]))
}

/** One combined hydration pass: joins items/categories (and, for admin
 * reads, borrower emails), and applies the category filter — which needs
 * the item→category join to exist first, since `requests` has no
 * category column of its own. */
async function hydrateRequests(
  raw: RawRequest[],
  options: { withBorrowerEmail: boolean; categoryId?: string }
): Promise<Request[]> {
  const itemsById = await fetchItemsByIds([...new Set(raw.map((r) => r.item_id))])

  const filtered = options.categoryId
    ? raw.filter((r) => itemsById.get(r.item_id)?.category_id === options.categoryId)
    : raw

  const categoryIds = [
    ...new Set([...itemsById.values()].map((item) => item.category_id)),
  ]
  const categoryNamesById = await fetchCategoryNamesByIds(categoryIds)
  const emailsByUserId = options.withBorrowerEmail
    ? await fetchEmailsByUserIds([...new Set(filtered.map((r) => r.user_id))])
    : new Map<string, string>()

  return filtered.map((r) => {
    const item = itemsById.get(r.item_id)
    return {
      ...r,
      item: {
        id: r.item_id,
        name: item?.name ?? "—",
        serial_number: item?.serial_number ?? "—",
        category_name: item ? (categoryNamesById.get(item.category_id) ?? "—") : "—",
      },
      borrower_email: options.withBorrowerEmail
        ? emailsByUserId.get(r.user_id)
        : undefined,
    }
  })
}

export type RequestFilters = {
  status?: RequestStatus
  categoryId?: string
}

/** RLS already scopes this to the caller's own rows. */
export async function listMyRequestsApi(
  filters: RequestFilters = {}
): Promise<Request[]> {
  let query = supabaseClient
    .from("requests")
    .select(REQUEST_COLUMNS)
    .order("created_at", { ascending: false })

  if (filters.status) query = query.eq("status", filters.status)

  const { data, error } = await query
  if (error) throw toApiError(error)

  return hydrateRequests(data, {
    withBorrowerEmail: false,
    categoryId: filters.categoryId,
  })
}

/** Admin-only in practice — RLS returns the caller's own rows only to a
 * non-admin regardless of this function being called. */
export async function listAllRequestsApi(
  filters: RequestFilters = {}
): Promise<Request[]> {
  let query = supabaseClient
    .from("requests")
    .select(REQUEST_COLUMNS)
    .order("created_at", { ascending: false })

  if (filters.status) query = query.eq("status", filters.status)

  const { data, error } = await query
  if (error) throw toApiError(error)

  return hydrateRequests(data, {
    withBorrowerEmail: true,
    categoryId: filters.categoryId,
  })
}

export async function getRequestByIdApi(
  requestId: string,
  isAdmin: boolean
): Promise<Request | null> {
  const { data, error } = await supabaseClient
    .from("requests")
    .select(REQUEST_COLUMNS)
    .eq("id", requestId)
    .maybeSingle()

  if (error) throw toApiError(error)
  if (!data) return null

  const [hydrated] = await hydrateRequests([data], { withBorrowerEmail: isAdmin })
  return hydrated
}

export type CreateRequestPayload = {
  item_id: string
  start_date: string
  end_date: string
  reason: string
}

export async function createRequestApi(payload: CreateRequestPayload): Promise<void> {
  const { error } = await supabaseClient.rpc("create_request", {
    p_item_id: payload.item_id,
    p_start_date: payload.start_date,
    p_end_date: payload.end_date,
    p_reason: payload.reason,
  })
  if (error) throw toApiError(error)
}

export async function approveRequestApi(requestId: string): Promise<void> {
  const { error } = await supabaseClient.rpc("update_request_status", {
    p_request_id: requestId,
    p_new_status: "approved",
  })
  if (error) throw toApiError(error)
}

export async function rejectRequestApi(requestId: string, reason: string): Promise<void> {
  const { error } = await supabaseClient.rpc("update_request_status", {
    p_request_id: requestId,
    p_new_status: "rejected",
    p_rejection_reason: reason,
  })
  if (error) throw toApiError(error)
}

export async function returnRequestApi(requestId: string): Promise<void> {
  const { error } = await supabaseClient.rpc("update_request_status", {
    p_request_id: requestId,
    p_new_status: "returned",
  })
  if (error) throw toApiError(error)
}

export async function cancelRequestApi(requestId: string): Promise<void> {
  const { error } = await supabaseClient.rpc("cancel_request", {
    p_request_id: requestId,
  })
  if (error) throw toApiError(error)
}

export async function checkItemsAvailabilityApi(
  itemIds: string[]
): Promise<Map<string, boolean>> {
  if (itemIds.length === 0) return new Map()
  const { data, error } = await supabaseClient.rpc("get_item_availability", {
    p_item_ids: itemIds,
  })
  if (error) throw toApiError(error)
  return new Map(data.map((row) => [row.item_id, row.is_available]))
}

export type BookedRange = {
  start_date: string
  end_date: string
}

/** The item's pending/approved booking date ranges — for highlighting
 * and disabling booked days in the request form's calendar, not a new
 * enforcement point (that's the database constraint; see
 * supabase/migrations/0012_date_range_overlap.sql). */
export async function getItemBookedRangesApi(itemId: string): Promise<BookedRange[]> {
  const { data, error } = await supabaseClient.rpc("get_item_booked_ranges", {
    p_item_id: itemId,
  })
  if (error) throw toApiError(error)
  return data
}
