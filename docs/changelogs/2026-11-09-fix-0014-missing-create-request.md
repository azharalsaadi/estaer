# 2026-11-09 — Confirmed root cause; fixed a gap in `0014` itself before it was ever applied

## Confirmed, not guessed, this time

The user retrieved `create_request`'s actual deployed definition via
`pg_get_functiondef('public.create_request(uuid, date, date, text)'::
regprocedure)`. Its `INSERT`'s exception block catches only
`unique_violation` — no mention of `exclusion_violation` anywhere. That
is exactly the shape of the *original* `0006_requests_functions.sql`
version, not the `0012_date_range_overlap.sql` version (which added
`or exclusion_violation` specifically because a GiST exclusion
constraint raises a different SQLSTATE than a plain unique index).

Since the live error for a genuinely non-overlapping Samsung Monitor
range was still a clean `P0001 ITEM_ALREADY_RESERVED` — not a raw,
uncaught Postgres exception — the constraint that actually fired had
to be a true `unique_violation` (23505). An exclusion constraint can
never raise that code. That's airtight: `requests_one_active_
reservation_per_item` (the original plain unique index on `item_id`
alone) is still what's live, and `0012_date_range_overlap.sql` never
actually reached this database. Both reported failures (Nov 19–20 and
Samsung Monitor's Nov 12–15) are the exact same cause: that old rule
rejects *any* second booking on an item while one is pending/approved,
completely independent of whether the dates overlap.

## A gap found in `0014` before the user ever ran it

The previous version of `0014_reassert_date_range_overlap.sql`
correctly swapped in the GiST exclusion constraint, but never
re-created `create_request` itself — it assumed `0012`'s version of
that function (which catches `exclusion_violation`) was already live.
Given the new evidence, that assumption was wrong: the live function
only catches `unique_violation`. Applying the old `0014` alone would
have fixed the constraint but left a genuine future overlap raising an
**uncaught** `exclusion_violation` instead of a clean error — a new
regression, caught before it was ever run.

## Fix: `0014` rewritten to be fully self-contained

**`supabase/migrations/0014_reassert_date_range_overlap.sql`** now
also re-creates `create_request` with the correct exception handling
(`when unique_violation or exclusion_violation`), alongside the
constraint swap and `get_item_booked_ranges`/`get_item_availability`.
This one file is sufficient on its own regardless of whatever subset
of `0012`/`0013` did or didn't reach the database before — nothing
else needs to be applied first or separately.

No date-blocking rule changed from the last two sessions: still the
same pending/approved statuses, still the same inclusive
`start_date..end_date` window, still no padding for the return due
date (a separate, display-only concept for the on-loan/overdue
dashboard badges — not part of the blocking window).

## Exact migration and how to verify

Run **`0014_reassert_date_range_overlap.sql`** in the SQL Editor.

To confirm the old index is actually gone afterward:
```sql
select conname, contype, pg_get_constraintdef(oid) as definition
from pg_constraint where conrelid = 'public.requests'::regclass;

select indexname, indexdef from pg_indexes
where tablename = 'requests' and schemaname = 'public';
```
You should see `requests_no_overlapping_reservation` with
`daterange(start_date, end_date, '[]') && ...` in its definition, and
`requests_one_active_reservation_per_item` gone entirely.

To verify a free range succeeds and an overlapping one is rejected —
substitute Samsung Monitor's real item id:
```sql
begin;
set local role authenticated;
set local request.jwt.claims := '{"sub": "<a-member-user_id>", "role": "authenticated"}';

-- Expect SUCCESS — a genuinely free range.
select (public.create_request(
  '<SAMSUNG_MONITOR_ID>'::uuid, '2026-11-12', '2026-11-15', 'Verification: free range'
)).id as booking_a_id;

-- Expect FAILURE with ITEM_ALREADY_RESERVED — overlaps booking_a.
select public.create_request(
  '<SAMSUNG_MONITOR_ID>'::uuid, '2026-11-14', '2026-11-17', 'Verification: overlap (expect conflict)'
);

-- Expect SUCCESS — starts the day after booking_a ends, no return-due padding.
select (public.create_request(
  '<SAMSUNG_MONITOR_ID>'::uuid, '2026-11-16', '2026-11-18', 'Verification: next free range'
)).id as booking_c_id;

rollback; -- discards all test rows regardless of outcome
```

## Verification actually run here

```
npm run typecheck   → passed
npm run test         → passed, 69/69 (unchanged — this turn was a
                        SQL-only fix; no frontend code changed)
```

## Not verified — needs the user

No database access exists in this environment. Apply `0014`, run the
`pg_constraint`/`pg_indexes` check to confirm the old index is gone,
then run the verification script above. Also still needs a real
browser session for the calendar's visual highlighting/disabling.
