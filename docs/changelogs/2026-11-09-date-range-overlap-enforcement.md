# 2026-11-09 — Date-range-aware booking overlap, "book for another date"

## Root cause found: the exclusivity rule was never date-range aware

`requests_one_active_reservation_per_item` (0001_schema.sql) was a
partial **unique index on `(item_id)`** for pending/approved rows — it
allowed at most ONE pending/approved request per item, *at all*,
regardless of dates. An item approved for Nov 9–11 could not be booked
for Nov 20–25 either, until the Nov 9–11 request was marked
`returned`. That directly contradicts the actual rule: a booking for
Nov 9–11 should still leave Nov 12 onward free.

`get_item_availability` had the same problem in the UI layer: "available"
meant "has zero pending/approved requests at all," so the catalog's
Request button stayed hard-disabled for an item with any future booking,
with no way to even open the form and try a different date.

## Fix: a real date-range exclusion constraint

New migration: **`supabase/migrations/0012_date_range_overlap.sql`** —
not yet applied to the live project.

```sql
create extension if not exists btree_gist;

drop index if exists public.requests_one_active_reservation_per_item;

alter table public.requests
  add constraint requests_no_overlapping_reservation
  exclude using gist (
    item_id with =,
    daterange(start_date, end_date, '[]') with &&
  )
  where (status in ('pending', 'approved'));
```

The `'[]'` bound makes **both** the start and end date inclusive —
"Nov 9–11" occupies Nov 9, 10, and 11. A request for Nov 11 conflicts;
a request for Nov 12 does not. Two requests can never share even one
calendar day on the same item while both pending/approved.

This is a Postgres **GiST exclusion constraint**, checked atomically by
the database on every `INSERT` — the same guarantee a unique index
gives, just over a range-overlap predicate instead of plain equality.
That atomicity is what makes "concurrent approvals" safe without any
extra locking: two overlapping-range requests for the same item can
never both be in `{pending, approved}` at once (the second INSERT is
rejected immediately), and approving a request never changes its date
range — so approving one can never newly conflict with another, because
nothing overlapping could ever have been inserted while it existed.

`create_request()` previously only caught `unique_violation` (23505)
from the old unique index; a GiST exclusion violation raises a
*different* code, `exclusion_violation` (23P01). Updated the exception
handler to catch both, so a real date conflict still surfaces as the
same clear `ITEM_ALREADY_RESERVED` error. `requestErrors.ts`'s
defensive fallback mapping got the same `23P01` case added, mirroring
its existing `23505` one.

`get_item_availability` is redefined to mean "booked for **today**
specifically" (`business_today() between start_date and end_date`)
rather than "has any booking ever" — matching what the UI now actually
displays.

## Frontend: button stays enabled, label and status line change

`RequestEquipmentAction.tsx` (used by both `/admin/borrow` and
`/member/catalog`, via the shared `CatalogBrowseView`): the button is no
longer disabled when an item is booked today. Above it, a status line
now reads **"Currently booked" / "محجوز حاليًا"** (`catalog.
reservedOrOnLoan` — the Arabic text was already exactly this; only the
English wording changed from "Currently reserved"). The button itself
reads **"Book for another date" / "احجز لتاريخ آخر"** (new
`catalog.bookAnotherDate` key) instead of "Request equipment" in that
case, but opens the exact same date-range form either way — the real
conflict check happens server-side on submit, not from this label.

`serverErrors.ITEM_ALREADY_RESERVED`'s wording was updated in both
languages to describe an overlapping date range specifically, rather
than implying a last-second race ("Someone else just reserved this
item...") — it's shown inline in `RequestEquipmentDialog` on submit,
unchanged wiring, only the text changed.

No time pickers were added — the existing `type="date"` inputs and
their zod schema are untouched, and the inclusive-day semantics now
match the UI's existing "last day of use" framing and
`getReturnDueDate()` exactly.

## Preserved, unchanged

- The full approval workflow (`update_request_status`,
  `cancel_request`) — neither was touched.
- Every existing request/history record — this only changes a
  constraint and two function bodies, no data migration.
- RLS — untouched.

## Verification

```
npm run typecheck   → passed
npm run lint         → passed, 0 errors (3 pre-existing informational warnings)
npm run test         → passed, 50/50 (unchanged — the actual overlap
                        logic lives entirely in SQL; there is no pure-JS
                        equivalent to unit test, consistent with this
                        project's existing test scope, which has never
                        included DB-dependent tests)
npm run build        → passed
```

## Not verified — needs the user to apply the migration and run this

No database credentials or SQL execution access exist in this
environment. After applying `0012_date_range_overlap.sql`, run this in
the SQL Editor (fully reversible — wrapped in a transaction that's
rolled back, creates no real data) to confirm the exact worked example
from the request:

```sql
begin;
set local role authenticated;
set local request.jwt.claims := '{"sub": "<a-member-user_id>", "role": "authenticated"}';

-- Replace <ITEM_ID> with any real active item's id.
select (public.create_request(
  '<ITEM_ID>'::uuid, '2026-11-09', '2026-11-11', 'Verification: booking A'
)).id as booking_a_id;

-- Expect this to FAIL with ITEM_ALREADY_RESERVED (Nov 11 overlaps booking A).
select public.create_request(
  '<ITEM_ID>'::uuid, '2026-11-11', '2026-11-13', 'Verification: booking B (expect conflict)'
);

-- Expect this to SUCCEED (Nov 12 starts the day after booking A ends).
select (public.create_request(
  '<ITEM_ID>'::uuid, '2026-11-12', '2026-11-14', 'Verification: booking C (expect success)'
)).id as booking_c_id;

rollback;
```

Also needs a real browser session: the catalog button showing "Currently
booked" + an enabled "Book for another date" for an item with a current
booking, opening the form, and the clear overlap message appearing in
the selected language when submitting conflicting dates.
