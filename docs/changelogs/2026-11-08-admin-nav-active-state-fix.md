# 2026-11-08 — Admin sidebar/drawer: fix Overview staying highlighted everywhere

## Root cause

TanStack Router's `<Link>` defaults to a path-segment **prefix** match
for `activeProps` (`activeOptions.exact` defaults to `false`): a link's
target counts as active whenever the current path equals it *or* starts
with it plus a `/`. Overview's link is `to="/admin"` — a literal prefix
of every other admin route (`/admin/categories`, `/admin/catalog`,
`/admin/requests`, `/admin/borrow`), so it stayed highlighted on all of
them, exactly as reported on the Categories page.

A second, opposite-direction issue existed for the same reason: the
request detail route's path is `/admin/request/$requestId` (singular),
which is a *sibling* of `/admin/requests` (plural), not nested under
it — so the default prefix match never highlighted "All Requests" when
viewing a request's detail page.

## Fix

`navConfig.ts`: `NavItem` gained two optional fields —
`exact` (highlight only on that literal path) and `alsoActiveOn` (extra
path prefixes to also treat as "this section"). Added a pure helper,
`isNavItemActive(pathname, item)`, as the one place this logic lives.

```ts
{ labelKey: "nav.adminOverview", to: "/admin", icon: LayoutDashboard, exact: true },
{ labelKey: "nav.adminRequests", to: "/admin/requests", icon: ListChecks,
  alsoActiveOn: ["/admin/request"] },
```

`AdminShell.tsx`'s `AdminNavLinks` now computes each item's active state
via `isNavItemActive(useLocation().pathname, item)` instead of `Link`'s
`activeProps`. `AdminNavLinks` is the single component already rendered
in both the desktop `<aside>` sidebar and the mobile `<Sheet>` drawer, so
one change covers both surfaces — no separate drawer-specific code
existed.

Catalog, Categories, and Borrow needed no changes — none of their paths
are a prefix of another admin route, so the default behavior was already
correct for them; only Overview and All Requests had an actual bug.

## Verification

```
npm run typecheck   → passed
npm run lint         → passed, 0 errors (3 pre-existing informational warnings)
npm run test         → passed, 45/45 (8 new, in navConfig.test.ts)
npm run build        → passed
```

New unit tests cover exactly the reported bug (Overview inactive on
`/admin/categories`, `/admin/catalog`, `/admin/requests`) and the detail-
page requirement (All Requests active on `/admin/request/abc-123`, a
path outside its own `/admin/requests` prefix).

## Not verified — needs a real browser

No browser automation exists in this environment. Unverified:
navigating to each admin page and refreshing shows exactly one nav item
highlighted at a time, in both the desktop sidebar and the mobile
drawer, including on a request detail page (All Requests should stay
highlighted there).

## Flagged, not fixed — same bug, member portal, out of scope

`MemberShell`'s nav still uses `Link`'s own `activeProps` directly and
has the identical latent bug: `MEMBER_NAV_ITEMS`' Home link
(`to: "/member"`) is a path-prefix of `/member/catalog` and
`/member/requests`, so it likely also stays highlighted everywhere. This
task was scoped to the admin portal only, so it was left untouched —
switching `MemberShell` to use the same `isNavItemActive` helper
(`exact: true` on Home, `alsoActiveOn: ["/member/request"]` on My
Requests) would fix it the same way, if wanted.
