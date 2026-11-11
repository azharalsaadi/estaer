/**
 * Stable, application-owned error codes. The UI translates these via the
 * `serverErrors.*` i18n block (with a `default` fallback) — it never
 * renders `APIError.message` directly, since that may carry a raw
 * provider-specific string that should stay out of user-facing text.
 */
export type ApiErrorCode =
  | "NOT_APPROVED_EMPLOYEE"
  | "OTP_INVALID_OR_EXPIRED"
  | "RATE_LIMITED"
  | "DUPLICATE_SERIAL_NUMBER"
  | "DUPLICATE_CATEGORY_NAME"
  | "FORBIDDEN"
  | "AUTH_REQUIRED"
  | "INVALID_DATE_RANGE"
  | "START_DATE_IN_PAST"
  | "INVALID_REASON"
  | "ITEM_NOT_AVAILABLE"
  | "ITEM_ALREADY_RESERVED"
  | "INVALID_TRANSITION"
  | "REJECTION_REASON_REQUIRED"
  | "REQUEST_NOT_FOUND"
  | "NETWORK_ERROR"
  | "UNKNOWN"

export type APIError = {
  code: ApiErrorCode
  /** Diagnostic only (console/log use) — never render this in the UI. */
  message: string
}
