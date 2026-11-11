# 2026-11-09 — Fix `/admin/borrow` dynamic-import crash; guard the form if migration 0013 is pending

## Root cause of the crash

Checked the dev server's actual HTTP responses for every file in the
new import chain (`RequestEquipmentAction` → `RequestEquipmentDialog` →
`BookingCalendar` → `ui/calendar.tsx`) — every one of **our own** source
files transformed fine (200 OK, valid JS). The failure was one level
deeper: `node_modules/.vite/deps/` (Vite's pre-bundled dependency cache)
had no entry for `react-day-picker` or `date-fns` at all, even though
both are in `package.json` and installed. The running dev server
predated those two packages (added by the `shadcn add calendar` run in
the previous session) and never re-ran its dependency optimizer against
the current lockfile, so the browser's dynamic import of the page chunk
ultimately depended on a dependency that was never bundled — surfacing
as "Failed to fetch dynamically imported module" at the top-level page,
even though the real gap was several imports deeper.

## Fix

Stopped the stale dev server process pair (`npm run dev` / `vite`,
confirmed via `Get-CimInstance`/`Get-NetTCPConnection`), deleted
`node_modules/.vite` outright rather than hoping an automatic
re-optimization would catch up, and restarted `npm run dev` on port
5180. Confirmed by direct HTTP request that `react-day-picker.js` is
now present in the regenerated deps cache and serves 200 through the
exact browser-facing URL (`/node_modules/.vite/deps/react-day-picker.js
?v=...`) that `ui/calendar.tsx`'s transformed output actually requests.

`/admin/borrow`, `/member/catalog`, and every other key route now
return 200 against the restarted server.

## Also: don't silently pretend nothing's booked if migration 0013 isn't applied yet

`RequestEquipmentDialog` now distinguishes `useItemBookedRanges`'s
loading state from an actual query **error** (previously only the
loading case was handled — an error silently fell back to an empty
booked-ranges array via `?? []`, meaning the calendar would show every
day as pickable and the client-side range check would never catch a
conflict, even though the database would still correctly reject it on
submit). If `get_item_booked_ranges` doesn't exist yet (migration 0013
pending) or the call fails for any other reason:
- A clear inline error renders instead of the calendars
  (`requests.availabilityCheckFailed`, both languages).
- The **Submit** button is disabled (`disabled={createRequest.isPending
  || bookedRangesQuery.isError}`), so the admin/member cannot submit a
  request this dialog couldn't actually verify, rather than discovering
  a conflict only after a failed submit.

This is a UX guard, not new enforcement — the real overlap rule remains
the database constraint from `0012_date_range_overlap.sql`.

## Verification

```
npm run typecheck   → passed
npm run lint         → passed, 0 errors (3 pre-existing informational warnings)
npm run test         → passed, 66/66 (unchanged — no new pure logic,
                        this is dev-server/query-state handling)
npm run build        → passed
```

Confirmed directly against the restarted dev server (curl, not a
browser): `/admin/borrow`, `/member/catalog`, `/admin`, `/member`,
`/login` all return 200; the updated dialog source (containing
`availabilityCheckFailed`) is what's actually being served.

## Not verified — needs a real browser

No browser automation exists in this environment. Unverified:
`/admin/borrow` and `/member/catalog` actually render in a browser
(not just 200 at the HTTP level) with the calendar visible; and — if
migration 0013 genuinely isn't applied on the live project yet — that
the new error message and disabled Submit button actually appear when
opening the request dialog there.
