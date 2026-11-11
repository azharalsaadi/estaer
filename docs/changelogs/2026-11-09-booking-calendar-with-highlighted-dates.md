# 2026-11-09 — Calendar date pickers with booked-day highlighting

## What changed

`RequestEquipmentDialog.tsx` (the request form shared by both
`/admin/borrow` and `/member/catalog`) replaced its two plain
`type="date"` inputs with a real calendar widget for Start Date and Last
Day of Use, showing the selected item's existing bookings directly on
the calendar.

## New component library piece: `ui/calendar.tsx`

Added via the shadcn CLI (`npx shadcn add calendar`), which pulled in
`react-day-picker@10.0.2` and `date-fns@4.4.0`. As in every prior
`shadcn add` in this project, it tried to overwrite `button.tsx` with a
registry copy importing `cn` from the npm package `cn` instead of
`@/lib/utils`, and added that package to `package.json`. Fixed the same
way as before: both files' import corrected back to `@/lib/utils`, the
`cn` package uninstalled. `button.tsx`'s actual variants/sizes are
otherwise unchanged (diffed against the pre-existing version — identical
content besides the import line).

Verified (by reading `react-day-picker`'s own source, not assumed) that
every button it renders — day cells, previous/next month — is given an
explicit `type="button"` by the library itself before any of this
project's code sees it, so none of this risks submitting the form on
a stray calendar click.

## New feature code: `BookingCalendar.tsx`

A thin wrapper around `ui/calendar.tsx` (`src/features/requests/
components/BookingCalendar.tsx`):
- Registers a custom `booked` day modifier (`isDateBooked` against the
  item's fetched ranges) and overrides `DayButton` to add `bg-muted` —
  the app's own existing soft-teal token (`--muted: #e3f7f4`), not a new
  color — whenever that modifier is set.
- The **selected** day keeps the Calendar's own default solid
  `bg-primary` styling. This is visually distinct from the booked
  highlight by construction: `bg-primary` is applied through a
  `data-[selected-single=true]:` variant, which has higher CSS
  specificity than the plain `bg-muted` class, so a day that is both
  booked and selected always shows as selected — no extra conditional
  needed.
- `disabled` is a required prop supplied by the caller, not baked in —
  see why below.

## Why Start Date and End Date need *different* disable rules

The Start Date calendar disables a day if it's simply booked
(`isDateBooked`) — picking a booked day as your start is never valid on
its own.

The End Date calendar disables a day if **the whole candidate range**
from the chosen start to that day would cross any booking
(`doesRangeCrossBooking`) — a plain "is this day booked" check is the
*wrong* rule here: if an item is booked Nov 9 only and you start Nov 5,
Nov 10 itself isn't a booked day, but choosing it as your end would
still create a range that swallows the Nov 9 booking. This is why
`BookingCalendar`'s `disabled` prop is required and caller-supplied
rather than a fixed internal rule.

A legend (`requests.bookedLegend`, "Booked" / "محجوز") renders once,
below both calendars.

## New read-only RPC: `get_item_booked_ranges`

New migration: **`supabase/migrations/0013_item_booked_ranges.sql`** —
not yet applied to the live project. Returns only an item's
pending/approved bookings' `start_date`/`end_date` — no requester
identity, same privacy-minimal pattern as the existing
`get_item_availability`. This is read-only UI support, not new
enforcement — the actual overlap rule is still the GiST exclusion
constraint from `0012_date_range_overlap.sql` (previous session).
`database.types.ts` and the access layer
(`getItemBookedRangesApi`/`useItemBookedRanges`) were extended to match.

Every mutation that changes a request's status (create, approve,
reject, return, cancel) now also invalidates the
`["items", "booked-ranges"]` query, alongside the existing
`["items", "availability"]` invalidation — so the calendar's
highlighting stays correct immediately after any of those actions.

## Client-side range validation

`createRequestSchema` is now a factory over `(today, bookedRanges)`
(was just `today`) and rejects the whole `[start_date, end_date]`
selection if it crosses any booked range
(`doesRangeCrossBooking`, new `validation.rangeCrossesBooking` message
in both languages), attached to `end_date` — the same place the
existing "end before start" check already attaches. This is a
UX-only safety net: the calendar's own `disabled` days already keep
the user from picking most invalid combinations before this ever runs,
and the database constraint is the actual enforcement either way.

New pure module `src/features/requests/lib/bookingOverlap.ts`
(`isDateBooked`, `rangesOverlap`, `doesRangeCrossBooking`) and two new
date/ISO conversion helpers in `lib/dates.ts`
(`isoToLocalDate`/`localDateToIso`, using the LOCAL-calendar `Date`
constructor specifically to avoid the classic UTC-string-parse bug that
shifts a date by one day in negative-UTC-offset timezones).

## Verification

```
npm run typecheck   → passed
npm run lint         → passed, 0 errors (3 pre-existing informational warnings)
npm run test         → passed, 66/66 (16 new)
npm run build        → passed
```

New tests directly encode the exact worked example from the request:
an item booked Nov 9–11 rejects Nov 11 as a start/crossing day and
accepts Nov 12 onward (`bookingOverlap.test.ts`), plus round-trip tests
for the new date/ISO conversion helpers confirming no timezone drift
(`dates.test.ts`).

## Not verified — needs the user

No database access or browser automation exists in this environment.
- Apply `0013_item_booked_ranges.sql` (the overlap rule itself,
  `0012`, should already be applied from the previous session).
- A real browser session: the calendar actually renders with booked
  days highlighted in teal, the legend shows, the Start Date picker
  visibly disables and includes the last day of an existing booking,
  the End Date picker disables days that would cross a booking even
  when they aren't themselves booked, RTL layout in Arabic, and the
  clear overlap error appearing in the selected language on a forced
  conflicting submission.
