# 2026-11-08 — Remove the admin "My Requests" page

Removed per request: the admin portal no longer has a personal "My
Requests" (طلباتي) view — only member "My Requests" and admin "All
Requests" remain.

## Removed

- `src/features/requests/routes/admin-my-requests.page.tsx`
- `src/features/requests/routes/admin-my-requests.route.tsx`
- The `adminMyRequestsRoute` import/child in `src/router/index.tsx`
- The nav entry in `ADMIN_NAV_ITEMS` (`src/components/layout/
  navConfig.ts`) — `AdminShell.tsx` renders this same list in both the
  desktop sidebar `<aside>` and the mobile `<Sheet>` drawer via one
  shared `AdminNavLinks` component, so removing the one entry here
  removed it from both surfaces at once; no separate drawer-specific
  config existed.
- `nav.adminMyRequests` from `en.json`/`ar.json`.
- The now-dead `"admin-own"` variant of `RequestsTable` — it existed
  solely for this page (admin detail route, no borrower column). Grepped
  first to confirm nothing else referenced it before removing it from
  the variant type and its jsdoc.

Grepped for every literal `/admin/my-requests` reference and every
`adminMyRequests`/`admin-own` identifier before and after the change —
nothing else pointed at this page (no dashboard quick-links, no other
redirects).

## Kept, unchanged

- `/admin/requests` (All Requests, admin), `/member/requests` (My
  Requests, member), and every request record.
- Shared components both pages still use: `RequestFiltersBar`,
  `RequestsTable` (now with a smaller, accurate variant type),
  `useMyRequests` (still used by the member page), `StatePanel`.

## Verification

```
npm run typecheck   → passed
npm run lint         → passed, 0 errors (3 pre-existing informational warnings)
npm run test         → passed, 37/37
npm run build        → passed
```

No Supabase/RLS/migration change — this was a frontend-only
route/nav/dead-code removal.
