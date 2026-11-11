import { supabaseClient } from "@/lib/supabaseClient"
import { toApiError } from "../lib/catalogErrors"
import type { Category } from "../catalog.types"

const CATEGORY_COLUMNS = "id, name, active, created_at"

export async function listActiveCategoriesApi(): Promise<Category[]> {
  const { data, error } = await supabaseClient
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .eq("active", true)
    .order("name")

  if (error) throw toApiError(error)
  return data
}

/** Admin-only in practice — RLS returns the same rows as the active list
 * to any non-admin caller regardless. */
export async function listAllCategoriesApi(): Promise<Category[]> {
  const { data, error } = await supabaseClient
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .order("name")

  if (error) throw toApiError(error)
  return data
}

export type CreateCategoryPayload = {
  name: string
  active: boolean
}

export async function createCategoryApi(
  payload: CreateCategoryPayload
): Promise<Category> {
  const { data, error } = await supabaseClient
    .from("categories")
    .insert(payload)
    .select(CATEGORY_COLUMNS)
    .single()

  if (error) throw toApiError(error)
  return data
}

export type UpdateCategoryPayload = {
  id: string
  name: string
  active: boolean
}

export async function updateCategoryApi({
  id,
  ...payload
}: UpdateCategoryPayload): Promise<Category> {
  const { data, error } = await supabaseClient
    .from("categories")
    .update(payload)
    .eq("id", id)
    .select(CATEGORY_COLUMNS)
    .single()

  if (error) throw toApiError(error)
  return data
}
