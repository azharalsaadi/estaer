import type { RequestStatus } from "./requests.types"

/** Mirrors the check constraints in supabase/migrations/0001_schema.sql. */
export const REQUEST_REASON_MAX_LENGTH = 1000
export const COMMENT_MAX_LENGTH = 2000

export const REQUEST_STATUS_OPTIONS: RequestStatus[] = [
  "pending",
  "approved",
  "rejected",
  "returned",
]

/** i18n key suffix per status, under `requests.status*`. */
export const REQUEST_STATUS_LABEL_KEYS: Record<RequestStatus, string> = {
  pending: "requests.statusPending",
  approved: "requests.statusApproved",
  rejected: "requests.statusRejected",
  returned: "requests.statusReturned",
}

/** Badge style per status, matching the approved design's semantic colors. */
export const REQUEST_STATUS_STYLES: Record<RequestStatus, string> = {
  pending: "border-warning/30 text-warning-foreground bg-warning/10",
  approved: "border-success/30 text-success-foreground bg-success/10",
  rejected: "border-destructive/30 text-destructive bg-destructive/10",
  returned: "border-neutral/30 text-neutral-foreground bg-neutral/20",
}
