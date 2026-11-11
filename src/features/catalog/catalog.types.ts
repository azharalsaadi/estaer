export type Category = {
  id: string
  name: string
  active: boolean
  created_at: string
}

export type Item = {
  id: string
  name: string
  category_id: string
  serial_number: string
  active: boolean
  image_path: string | null
  created_at: string
  /** Joined client-side in apis/items.api.ts — avoids a second round trip per list screen. */
  category: Pick<Category, "id" | "name" | "active">
}

/** The plain `items` row, before the category join — what create/update return. */
export type ItemRow = Omit<Item, "category">
