export type BookedRange = {
  start_date: string
  end_date: string
}

/**
 * Both bounds inclusive — a booking from "2026-11-09" to "2026-11-11"
 * occupies the 9th, 10th, and 11th. ISO "YYYY-MM-DD" strings compare
 * correctly with plain string comparison (zero-padded, same length).
 */
export function isDateBooked(date: string, bookedRanges: BookedRange[]): boolean {
  return bookedRanges.some((range) => date >= range.start_date && date <= range.end_date)
}

/** Standard inclusive date-range overlap test: two ranges overlap iff
 * each one's start is on or before the other's end. */
export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return aStart <= bEnd && bStart <= aEnd
}

/** Whether the candidate [start, end] range crosses ANY existing booked
 * range — used to validate the whole selection, not just whether the
 * end date itself happens to be a booked day. */
export function doesRangeCrossBooking(
  start: string,
  end: string,
  bookedRanges: BookedRange[]
): boolean {
  return bookedRanges.some((range) =>
    rangesOverlap(start, end, range.start_date, range.end_date)
  )
}
