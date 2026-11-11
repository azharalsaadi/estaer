import { z } from "zod"
import {
  CATEGORY_NAME_MAX_LENGTH,
  ITEM_NAME_MAX_LENGTH,
  ITEM_SERIAL_NUMBER_MAX_LENGTH,
} from "./catalog.constants"

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "validation.categoryNameRequired")
    .max(CATEGORY_NAME_MAX_LENGTH, "validation.categoryNameTooLong"),
  active: z.boolean(),
})

export type CategoryFormData = z.infer<typeof categorySchema>

/**
 * A factory, not a static schema: which `category_id` values are valid
 * depends on the categories loaded at runtime (see
 * docs/STRUCTURE.md naming conventions — "factories for runtime-dependent
 * valid options").
 */
export function createItemSchema(validCategoryIds: string[]) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, "validation.itemNameRequired")
      .max(ITEM_NAME_MAX_LENGTH, "validation.itemNameTooLong"),
    category_id: z
      .string()
      .min(1, "validation.categoryRequired")
      .refine((value) => validCategoryIds.includes(value), {
        message: "validation.categoryRequired",
      }),
    serial_number: z
      .string()
      .trim()
      .min(1, "validation.serialNumberRequired")
      .max(ITEM_SERIAL_NUMBER_MAX_LENGTH, "validation.serialNumberTooLong"),
    active: z.boolean(),
  })
}

export type ItemFormData = z.infer<ReturnType<typeof createItemSchema>>
