import { z } from "zod"
import { COMMENT_MAX_LENGTH, REQUEST_REASON_MAX_LENGTH } from "./requests.constants"
import { doesRangeCrossBooking, type BookedRange } from "./lib/bookingOverlap"
import { businessToday } from "./lib/dates"

/**
 * A factory, not a static schema: "today" (the minimum valid start date)
 * and the item's currently booked ranges are only known at the moment
 * the form is used — see docs/STRUCTURE.md's "factories for
 * runtime-dependent valid options". `bookedRanges` is a client-side,
 * UX-only check (the calendar already keeps the user from picking most
 * invalid combinations in the first place); the database's exclusion
 * constraint (0012_date_range_overlap.sql) is the actual enforcement.
 */
export function createRequestSchema(
  today: string = businessToday(),
  bookedRanges: BookedRange[] = []
) {
  return z
    .object({
      start_date: z
        .string()
        .min(1, "validation.startDateRequired")
        .refine((value) => value >= today, "validation.startDateInPast"),
      end_date: z.string().min(1, "validation.lastDayRequired"),
      reason: z
        .string()
        .trim()
        .min(1, "validation.reasonRequired")
        .max(REQUEST_REASON_MAX_LENGTH, "validation.reasonTooLong"),
    })
    .refine((values) => values.end_date >= values.start_date, {
      message: "validation.lastDayBeforeStart",
      path: ["end_date"],
    })
    .refine(
      (values) => !doesRangeCrossBooking(values.start_date, values.end_date, bookedRanges),
      {
        message: "validation.rangeCrossesBooking",
        path: ["end_date"],
      }
    )
}

export type RequestFormData = z.infer<ReturnType<typeof createRequestSchema>>

export const rejectRequestSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "validation.rejectionReasonRequired")
    .max(REQUEST_REASON_MAX_LENGTH, "validation.rejectionReasonRequired"),
})

export type RejectRequestFormData = z.infer<typeof rejectRequestSchema>

export const commentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "validation.commentRequired")
    .max(COMMENT_MAX_LENGTH, "validation.commentTooLong"),
})

export type CommentFormData = z.infer<typeof commentSchema>
