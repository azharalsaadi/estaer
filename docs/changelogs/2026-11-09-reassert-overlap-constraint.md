# 2026-11-09 — Diagnose and re-assert the booking overlap constraint

## Diagnosis: not a logic bug, a deployment-state mismatch

Traced `get_item_booked_ranges`, `get_item_availability`, and
`create_request`'s exclusion constraint side by side. All three already
agree exactly: the same blocking statuses (`pending`, `approved`), the
same inclusive `start_date..end_date` window, and — important given the
question raised — **no padding for "the return due date" anywhere**.
The return due date (`getReturnDueDate()` = end_date + 1 day) is a
separate, display-only concept used for the on-loan/overdue dashboard
badges; it has never been part of the blocking window in this project's
SQL. A booking ending Nov 20 blocks exactly Nov 19–20 — Nov 21 is free,
consistent with the original "book for another date" requirement.

Given the code was already self-consistent, the far more likely
explanation for "the calendar let me pick dates that `create_request`
then rejected" is that `0012_date_range_overlap.sql`'s exclusion
constraint never actually took effect on the live database — meaning
`requests_one_active_reservation_per_item` (the OLD date-blind unique
index from `0001_schema.sql`, "at most one pending/approved request per
item, ever, regardless of dates") is still what's really enforcing
uniqueness there. If so, `create_request` would reject *any* second
booking on an item while one is pending/approved — including dates the
calendar correctly shows as free — which is exactly the reported
symptom.

## Fix: a self-contained, idempotent re-assertion

New migration: **`supabase/migrations/0014_reassert_date_range_overlap.sql`**
— not yet applied. It unconditionally drops both the old index and the
new constraint (if either exists) before re-adding the constraint, so
it's safe to run regardless of whether `0012` already succeeded,
partially applied, or never ran at all. It also re-asserts
`get_item_booked_ranges` and `get_item_availability` verbatim, so this
one migration is a complete fix on its own — you don't need to also
re-check `0012`/`0013` separately.

## How to confirm which one was actually live, before and after

Run this in the SQL Editor — it shows you the actual constraint
definitions directly, no simulated session needed:

```sql
select conname, contype, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.requests'::regclass;

select indexname, indexdef
from pg_indexes
where tablename = 'requests' and schemaname = 'public';
```

Before `0014`: if you see `requests_one_active_reservation_per_item` as
a plain index (no `daterange`/`&&` in its definition) and no
`requests_no_overlapping_reservation` exclusion constraint, that
confirms the diagnosis. After applying `0014`: the old index should be
gone, and `requests_no_overlapping_reservation` should appear with
`daterange(start_date, end_date, '[]') && ...` in its definition.

## Verification SQL for the exact scenario reported

```sql
begin;
set local role authenticated;
set local request.jwt.claims := '{"sub": "<a-member-user_id>", "role": "authenticated"}';

-- Replace <ITEM_ID> with any real active item's id.
select (public.create_request(
  '<ITEM_ID>'::uuid, '2026-11-19', '2026-11-20', 'Verification: booking A'
)).id as booking_a_id;

-- Expect this to FAIL with ITEM_ALREADY_RESERVED (crosses Nov 19-20).
select public.create_request(
  '<ITEM_ID>'::uuid, '2026-11-18', '2026-11-22', 'Verification: booking B (expect conflict)'
);

-- Expect this to SUCCEED — Nov 21 onward, after the booking ends.
select (public.create_request(
  '<ITEM_ID>'::uuid, '2026-11-21', '2026-11-23', 'Verification: booking C (expect success)'
)).id as booking_c_id;

-- Also check the calendar's own data source agrees:
select * from public.get_item_booked_ranges('<ITEM_ID>'::uuid);
-- should show exactly one row: 2026-11-19 to 2026-11-20

rollback; -- discards all test rows regardless of outcome
```

## Verification actually run here

```
npm run typecheck   → passed
npm run lint         → passed, 0 errors (3 pre-existing informational warnings)
npm run test         → passed, 69/69 (3 new)
npm run build        → passed
```

Added a new test block (`bookingOverlap.test.ts`) directly encoding the
exact scenario reported: Nov 19 and Nov 20 both individually flagged as
booked, Nov 18–22 rejected (crosses both days), and Nov 21 free with no
return-due-date padding.

## Not verified — needs the user

No database access exists in this environment. Apply
`0014_reassert_date_range_overlap.sql`, run the `pg_constraint`/
`pg_indexes` check above to confirm the old index is gone, then run the
verification script to confirm Nov 19–20 highlighted/disabled, Nov
18–22 rejected, and Nov 21 onward accepted. Also needs a real browser
session to confirm the calendar visually highlights Nov 19 and 20 in
teal and disables them, and that a genuinely available future range
can be submitted through the actual form while the item is currently
booked.
