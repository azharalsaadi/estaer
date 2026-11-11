const BUSINESS_TIMEZONE = "Asia/Muscat"

/**
 * "Today" in the business timezone, as YYYY-MM-DD. Mirrors
 * business_today() in supabase/migrations/0006_requests_functions.sql —
 * the server function is the actual enforcement; this is only for
 * client-side display (an "Overdue" badge, disabling a past start date in
 * a date picker). A small clock skew here is cosmetic, never a security
 * boundary — every real transition is re-validated server-side.
 */
export function businessToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIMEZONE }).format(
    new Date()
  )
}

/**
 * Converts an ISO "YYYY-MM-DD" string to a Date using the LOCAL
 * calendar date constructor, not `new Date(isoString)` — the latter
 * parses as UTC midnight, which `react-day-picker`'s local-calendar
 * comparisons can then read back as the PREVIOUS day in any
 * negative-UTC-offset timezone. This is purely a calendar-widget
 * display/selection concern — every real transition is still
 * re-validated server-side against the plain date string.
 */
export function isoToLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day)
}

/** The inverse of isoToLocalDate — reads the Date's own local
 * year/month/day, never its UTC fields. */
export function localDateToIso(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Return due date = the calendar day after the last day of use (inclusive last day). */
export function getReturnDueDate(lastDayOfUse: string): string {
  return addDays(lastDayOfUse, 1)
}

/** Overdue begins the day AFTER the return due date, if not yet returned. */
export function isOverdue(
  status: string,
  endDate: string,
  today = businessToday()
): boolean {
  if (status !== "approved") return false
  const overdueFrom = addDays(getReturnDueDate(endDate), 1)
  return today >= overdueFrom
}

/** On loan: approved, start date has arrived, not yet returned (approval
 * alone is not physical handover — REQUIREMENTS.md §19). */
export function isOnLoan(
  status: string,
  startDate: string,
  today = businessToday()
): boolean {
  return status === "approved" && today >= startDate
}
