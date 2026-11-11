# 2026-11-08 — Phase 4 bug fixes + images, Phase 5/6: full requests workflow

## Bug investigation (no browser available this session)

I could not reproduce either bug live — no browser-automation tool exists
in this environment, and I was not given (and should not be given) real
session credentials. What I _could_ do: a full re-audit of every relevant
RLS policy/grant (found no logical error), and a read-only `curl` check
against the live project with the anon key, confirming every table
(`categories`, `items`, `profiles`, `approved_employees`, `requests`)
exists and correctly rejects `anon` with `42501` — i.e., Phase 3/4's
migrations are genuinely live.

1. **Member catalog "generic error" after admin adds equipment.** No
   logical bug found in RLS/grants after a full re-read. One concrete
   resilience bug WAS found and fixed in `features/auth/apis/auth.api.ts`:
   `subscribeToAuthChangesApi`'s background re-fetch (fired on every
   `onAuthStateChange` event, including token refresh) treated ANY fetch
   failure — even a transient network blip — as "signed out," nulling the
   user. Fixed to log and keep the previous state instead; only an actual
   `session === null` now signs the app out. This is the most plausible
   source of an intermittent, unrelated-looking error.
2. **Admin sometimes ends up on a member URL.** No bug found in the save
   flow, navigation, or route guards after a full re-read — `closeDialog()`
   in both admin catalog pages explicitly targets `/admin/catalog`, and
   `adminLayoutRoute.beforeLoad` only ever redirects an unauthenticated
   admin to `/admin/login` or a non-admin to `/access-denied`, never to a
   member URL directly. The most likely explanation, matching your own
   hint about testing in separate sessions: **Supabase's GoTrue client
   syncs auth state across tabs of the same browser profile via storage
   events.** If admin and member were tested in two tabs of the _same_
   browser (not a separate profile/incognito), signing in as the member in
   one tab silently swaps the session seen by the admin tab too — the next
   navigation there correctly (not buggily) treats the now-member session
   as a member and routes accordingly. Please re-test with the admin and
   member in genuinely separate browser profiles (or one regular + one
   incognito window) and let me know if it still occurs — if so, that
   would point to an actual bug I haven't found yet.

## Bug fix: Phase 3 RLS gap found while building Requests

`migrations/0007_item_history_visibility.sql` — `items_select`/
`categories_select` (0003_rls.sql) only ever let a member see _active_
rows. That silently hid an item/category from a member viewing their OWN
past request once an admin deactivated it — violating REQUIREMENTS.md
§13's "historical requests remain readable to their authorized owners."
Fixed by adding an OR clause: a member may also see an item/category one
of THEIR OWN requests references, regardless of current active state.
Browsing (`listActiveItemsApi`) is unaffected — it filters on `active =
true` itself, independent of this RLS clause.

## Equipment images (migration `0005_item_images.sql`)

- `items.image_path` column; a **public** storage bucket
  `equipment-images` (read needs no auth — equipment photos aren't
  sensitive); storage.objects RLS: admin-only insert/update/delete,
  scoped to this bucket.
- `ItemDialog` gained an optional image field (JPEG/PNG/WebP, ≤5 MB,
  client-validated) with a live preview; upload happens after the item
  row is saved, to a fixed path `<item_id>/cover` (`upsert: true`) so a
  replacement overwrites rather than orphaning the old file.
- `EquipmentCard` shows the uploaded image when present, else the
  existing category-SVG illustration, else a generic icon — a real
  fallback chain, not a crash.

## Requests workflow (migration `0006_requests_functions.sql`)

Everything is a narrowly-scoped `SECURITY DEFINER` function, each
re-validating the current row state (never trusting the caller):
`business_today()` (single place to change the Asia/Muscat business
timezone), `create_request()` (the exclusive-reservation rule — the
`requests_one_active_reservation_per_item` unique index from 0001 is the
actual atomicity guarantee; this function turns a race into a clean
`ITEM_ALREADY_RESERVED` instead of a raw constraint error),
`update_request_status()` (approve/reject/return, admin-only, rejection
requires a reason — added a `note` column to `request_status_history` for
it), `get_item_availability()` (lets a member know if an item is
currently blocked, without exposing whose request it is).

**`cancel_request()` — a deliberate, flagged assumption.** You asked for
request cancellation; the originally-approved plan's closed status set
(`pending → approved → returned` or `pending → rejected`, explicitly "do
not add cancelled...") doesn't include one. I implemented cancellation as
a member withdrawing their own still-_pending_ request by reusing the
`rejected` status — distinguished from an admin rejection by actor (the
requester themselves) and a `"Cancelled by requester"` note, not by a new
status value. Narrowly scoped: pending-only, own-request-only, so it can't
touch an approved or returned request. **Not implemented: extensions**
(changing dates on an approved request) — this has no specified design in
the approved plan and materially changes the reservation model; I did not
invent one. Flag for your decision before I build it.

Frontend: full `features/requests/` (types, schema, constants, apis,
hooks, components, 5 routes — My Requests × member/admin-own, All
Requests, and two new detail routes `/member/request/$requestId` and
`/admin/request/$requestId`) — "Request equipment" on `EquipmentCard` via
a render-prop (`CatalogBrowseView`'s `renderCardFooter`) so the catalog
feature stays free of borrowing logic; status/category filters in the URL
on every list; status history and comments on every detail page
(comments/reasons rendered as plain text only — no
`dangerouslySetInnerHTML` anywhere); dashboard `StatsRow` now shows real
counts (`features/dashboard/apis/dashboard.api.ts`, one function serving
both portals since RLS already scopes member-vs-admin visibility).

Promoted `CatalogStatePanel` → `components/shared/StatePanel.tsx` once
the requests feature needed the identical loading/empty/error pattern
(per "feature-local until proven shared").

## Tests (none existed before this session)

Added `vitest` (`npm run test`). Two suites, both pure-function unit
tests needing no database:

- `features/requests/lib/dates.test.ts` — the exact worked example from
  REQUIREMENTS.md §15 (return due = last day + 1; overdue begins the day
  _after_ return due, not on it) plus on-loan/overdue edge cases per
  status.
- `features/auth/lib/safeRedirect.test.ts` — open-redirect attempts
  (protocol-relative, absolute external, backslash trick).

**Not covered by automated tests** (would need a real database
connection, which I don't have safe access to): the reservation
concurrency race, status-transition enforcement, RLS policies themselves.
These need either a Supabase local/test instance or manual verification —
see the testing steps at the end of this session's report.

## Verification actually run

```
npm run typecheck   → passed
npm run lint        → passed, 0 errors (3 pre-existing/informational warnings)
npm run build       → passed
npm run test         → passed, 20/20
```

Live-project read-only check (anon key, `curl`): confirmed every table
still exists and still rejects anon correctly after this session's
changes.

**Not verified**: any authenticated flow in a real browser (no
browser-automation tool here) — adding an image, requesting equipment,
approving/rejecting, returns, overdue display, the cross-tab session
theory for bug #2. See the manual testing steps provided separately.

## What you still need to do in Supabase

Run, in order, in the SQL Editor: `0005_item_images.sql`,
`0006_requests_functions.sql`, `0007_item_history_visibility.sql`.
Nothing else changed in Supabase config (Auth Hook, email template, API
keys are all unchanged from Phase 3).
