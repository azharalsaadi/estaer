import { supabaseClient } from "@/lib/supabaseClient"
import { EQUIPMENT_IMAGES_BUCKET } from "../catalog.constants"
import { toApiError } from "../lib/catalogErrors"
import type { Category, Item, ItemRow } from "../catalog.types"

const ITEM_COLUMNS =
  "id, name, category_id, serial_number, active, image_path, created_at"
const CATEGORY_COLUMNS = "id, name, active, created_at"

/**
 * Joined client-side (two plain selects) rather than via a Postgrest
 * embedded-resource filter — simpler to keep fully typed against the
 * hand-written Database generic, and categories are a short list we need
 * loaded for the UI (filters/dropdowns) anyway. RLS still independently
 * guarantees a non-admin never receives an inactive row either way; this
 * join only shapes what an already-authorized caller sees.
 */
function joinItemsWithCategories(items: ItemRow[], categories: Category[]): Item[] {
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  return items.map((item) => ({
    ...item,
    category: categoryById.get(item.category_id) ?? {
      id: item.category_id,
      name: "—",
      active: false,
    },
  }))
}

/** Active items in active categories — what a member may browse, and
 * what an admin sees when borrowing (not managing) equipment. */
export async function listActiveItemsApi(): Promise<Item[]> {
  const [categoriesResult, itemsResult] = await Promise.all([
    supabaseClient.from("categories").select(CATEGORY_COLUMNS).eq("active", true),
    supabaseClient.from("items").select(ITEM_COLUMNS).eq("active", true),
  ])

  if (categoriesResult.error) throw toApiError(categoriesResult.error)
  if (itemsResult.error) throw toApiError(itemsResult.error)

  const activeCategoryIds = new Set(categoriesResult.data.map((category) => category.id))
  const itemsInActiveCategories = itemsResult.data.filter((item) =>
    activeCategoryIds.has(item.category_id)
  )

  return joinItemsWithCategories(itemsInActiveCategories, categoriesResult.data)
}

/** Every item regardless of active state — admin catalog management only
 * in practice; RLS returns the same set as listActiveItemsApi to anyone
 * else. */
export async function listAllItemsApi(): Promise<Item[]> {
  const [categoriesResult, itemsResult] = await Promise.all([
    supabaseClient.from("categories").select(CATEGORY_COLUMNS),
    supabaseClient.from("items").select(ITEM_COLUMNS),
  ])

  if (categoriesResult.error) throw toApiError(categoriesResult.error)
  if (itemsResult.error) throw toApiError(itemsResult.error)

  return joinItemsWithCategories(itemsResult.data, categoriesResult.data)
}

export type CreateItemPayload = {
  name: string
  category_id: string
  serial_number: string
  active: boolean
}

export async function createItemApi(payload: CreateItemPayload): Promise<ItemRow> {
  const { data, error } = await supabaseClient
    .from("items")
    .insert(payload)
    .select(ITEM_COLUMNS)
    .single()

  if (error) throw toApiError(error)
  return data
}

export type UpdateItemPayload = {
  id: string
  name: string
  category_id: string
  serial_number: string
  active: boolean
}

export async function updateItemApi({
  id,
  ...payload
}: UpdateItemPayload): Promise<ItemRow> {
  const { data, error } = await supabaseClient
    .from("items")
    .update(payload)
    .eq("id", id)
    .select(ITEM_COLUMNS)
    .single()

  if (error) throw toApiError(error)
  return data
}

export function getItemImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null
  const { data } = supabaseClient.storage
    .from(EQUIPMENT_IMAGES_BUCKET)
    .getPublicUrl(imagePath)
  return data.publicUrl
}

function getFileExtension(file: File): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(file.name)
  return match ? `.${match[1].toLowerCase()}` : ""
}

/**
 * Uploads a replacement cover image under a fresh, unique object name and
 * records its path on the item row, then best-effort deletes the item's
 * previous image object (if any).
 *
 * A *new* path per upload — rather than reusing one fixed path like
 * "<id>/cover" — is deliberate: Supabase Storage's public URLs are served
 * through a cache, and re-uploading to the SAME path leaves the browser
 * (and any intermediate cache) free to keep serving the previous response
 * for that URL indefinitely, even though a direct fresh request to the
 * object returns the new content immediately — the exact "200 OK but the
 * browser shows the old/broken image" symptom this fixes. A unique path
 * makes that impossible by construction: every replacement image gets a
 * URL nothing has ever cached before.
 */
export async function uploadItemImageApi(
  itemId: string,
  file: File,
  previousImagePath?: string | null
): Promise<string> {
  const path = `${itemId}/${crypto.randomUUID()}${getFileExtension(file)}`

  const { error: uploadError } = await supabaseClient.storage
    .from(EQUIPMENT_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type })

  if (uploadError) throw toApiError(uploadError)

  const { error: updateError } = await supabaseClient
    .from("items")
    .update({ image_path: path })
    .eq("id", itemId)

  if (updateError) throw toApiError(updateError)

  // Diagnostic only: proves a genuine new upload ran (a fresh random path,
  // never "<id>/cover") — visible in the browser console so a re-test can
  // be confirmed as using the current code rather than a stale page.
  console.info("[catalog] uploaded item image, new path:", path)

  if (previousImagePath && previousImagePath !== path) {
    // Best-effort: the new image is already uploaded and already recorded
    // on the item, so a cleanup failure here must not fail the upload the
    // caller is waiting on. Leaves at most one orphaned object behind.
    const { error: removeError } = await supabaseClient.storage
      .from(EQUIPMENT_IMAGES_BUCKET)
      .remove([previousImagePath])
    if (removeError) console.error("Failed to remove previous item image", removeError)
  }

  return path
}
