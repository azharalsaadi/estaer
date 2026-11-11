export type RequestStatus = "pending" | "approved" | "rejected" | "returned"

export type Request = {
  id: string
  user_id: string
  item_id: string
  start_date: string
  end_date: string
  reason: string
  status: RequestStatus
  created_at: string
  updated_at: string
  /** Joined client-side, like the catalog feature's items/categories join. */
  item: {
    id: string
    name: string
    serial_number: string
    category_name: string
  }
  /**
   * Only ever populated on an ADMIN read (joined against `profiles`,
   * which only an admin may read for someone else's row — RLS blocks a
   * member from reading another user's profile, including an admin's).
   * A member's own borrower identity is implicit (it's them); the UI
   * never needs to look up anyone else's email for their own requests.
   */
  borrower_email?: string
}

export type StatusHistoryEntry = {
  id: string
  request_id: string
  from_status: RequestStatus | null
  to_status: RequestStatus
  actor_id: string
  note: string | null
  created_at: string
}

export type Comment = {
  id: string
  request_id: string
  author_id: string
  body: string
  created_at: string
}
