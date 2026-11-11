/** Mirrors the check constraints in supabase/migrations/0001_schema.sql. */
export const CATEGORY_NAME_MAX_LENGTH = 80
export const ITEM_NAME_MAX_LENGTH = 120
export const ITEM_SERIAL_NUMBER_MAX_LENGTH = 60

export const CATALOG_VISIBILITY_OPTIONS = ["active", "inactive"] as const
export type CatalogVisibilityFilter = (typeof CATALOG_VISIBILITY_OPTIONS)[number]

export const EQUIPMENT_IMAGES_BUCKET = "equipment-images"
export const ITEM_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024
export const ITEM_IMAGE_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
