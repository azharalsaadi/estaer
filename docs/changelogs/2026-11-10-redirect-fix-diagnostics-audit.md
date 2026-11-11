# 2026-11-10 — Role-aware post-login landing, catalog diagnostics, full spec audit

## Catalog: still blocked on one piece of evidence I cannot get myself

I re-probed the live project with the anon key as before. Result:
`categories`/`items` now return the **expected, generic** `42501
permission denied` — not `42P17` anymore. That's a necessary but **not
sufficient** signal: `anon` has zero grants on these tables, so Postgres
rejects the request on the ACL check before RLS policies are ever
evaluated. My anon probe structurally cannot exercise the `authenticated`
role's policy evaluation — which is exactly where a recursion would
occur if one still existed. I have no credentials for an authenticated
session (correctly — I should not have them), and no browser-automation
tool exists in this environment, so I cannot get you the current error
myself.

**I need one specific thing from you**: open the browser's DevTools →
Network tab, reload `/member/catalog` as a signed-in member, click the
failed `categories` or `items` request, and paste me its response body
(the JSON with `code`/`message`/`hint`). That is the one piece of
evidence that unblocks further diagnosis — a static re-read of
`0008_fix_catalog_rls_recursion.sql` found no remaining structural
issue, so the next step genuinely depends on seeing the live error.

To make this easier going forward, I added real diagnostics:
`features/catalog/lib/catalogErrors.ts` and
`features/requests/lib/requestErrors.ts` now `console.error` the full
Postgrest `code`/`message`/`details`/`hint` for any error they don't
already have a specific mapping for (the UI still only ever shows the
generic translated fallback — this is diagnostic-only, nothing
user-facing changed). Opening the browser console on the failing page
will now show the real error directly, without needing another
round-trip through me.

## Real fix: role-aware post-login landing

Re-reading the newly-stated spec ("restore the originally requested page
when the user's role permits it... land on `/admin` for admins and
`/member` for members") against the existing code found a genuine gap:
both login pages' post-verification navigation used a **hardcoded**
fallback (`/member` on the member login page, `/admin` on the admin login
page) regardless of the just-verified user's actual role. A member who
had been bounced to `/login?redirect=/admin/catalog` (e.g. by typing an
admin URL while signed out) would be navigated straight at
`/admin/catalog` — safely caught by `adminLayoutRoute`'s own guard and
bounced to `/access-denied` a moment later, so not a security hole, but
not the UX this spec asks for either. And a member who used the
_admin_ login page would have landed on `/admin` first, then been
bounced — also not what's wanted.

Fixed in `features/auth/lib/safeRedirect.ts`:

- `getRoleHomePath(role)` — `/admin` for admin, `/member` for member.
- `resolvePostLoginDestination(candidate, role)` — honors a safe,
  role-appropriate `redirect` target; otherwise (or if a non-admin's
  target points into `/admin/*`) falls back to the role home. An admin
  may still land on a requested `/member/*` page (admins retain member
  abilities).

Both `member-login.page.tsx` and `admin-login.page.tsx` now call this
with the just-verified user's real role instead of a hardcoded fallback
— both pages now behave identically regardless of which login URL was
used, matching "visiting an admin login URL does not grant an admin
role" and the new landing-page rule at once.

Added 9 new tests covering this (admin→admin page, member→member page,
member blocked from an admin target, admin allowed a member target, both
role-home fallbacks, open-redirect still blocked regardless of role).

## Spec audit — everything else already in place, nothing else changed

Re-checked the full requirements list against the existing implementation
built across prior sessions:

- **Roles/separation, admin-URL blocking**: `adminLayoutRoute` (role
  check) / `memberLayoutRoute` (any authenticated user) in
  `router/protected.routes.tsx`; `navConfig.ts` keeps two entirely
  separate nav lists, never combined. Unchanged, still correct.
- **Catalog CRUD, active/inactive**: `CategoryDialog`/`ItemDialog`,
  deactivation-not-deletion, member sees active-in-active-category only.
  Unchanged.
- **Requests**: `create_request`/`update_request_status` RPCs enforce
  the exact `pending→approved→returned` / `pending→rejected` transitions
  server-side; `RequestFiltersBar` keeps status/category in the URL on
  both My Requests and All Requests; `RequestDetailView` shows
  info+history+comments. Unchanged.
- **Dashboard**: `dashboard.api.ts`'s one function serves both portals,
  scoped by RLS. Unchanged.
- **UX**: loading/empty/error via `StatePanel` across catalog and
  requests screens; `AdminShell`/`MemberShell` already use a `Sheet`
  drawer under the small-screen breakpoint. Unchanged.
- **Strict TypeScript**: grepped the entire `src/` tree for `any` —
  every match is the English word inside a comment, zero actual `any`
  type usage anywhere.
- **Feature organization, API boundary**: unchanged — already
  feature-scoped with `apis/`/`hooks/`/`components/` per feature, and
  `supabaseClient` is only ever imported from `lib/supabaseClient.ts`
  and feature `apis/*.api.ts` files.
- **Security**: RLS remains enabled everywhere; no grant or policy was
  loosened. Direct cross-user access and admin-only-action attempts via
  raw Supabase calls are architecturally blocked by the same RLS/grants
  already audited in prior sessions — I cannot re-exercise this live
  without an authenticated session (see "Not verified" below).

## Verification actually run

```
npm run typecheck   → passed
npm run lint         → passed, 0 errors (3 pre-existing/informational warnings)
npm run build        → passed
npm run test         → passed, 31/31 (9 new)
```

Live-project anon probe: `categories`/`items` now return generic `42501`,
not `42P17` — necessary but not sufficient evidence (see above).

## Not verified (needs you)

- The actual current catalog error for an authenticated member — the one
  blocker described above.
- Everything that needs a real browser session: the catalog actually
  rendering cards/images, image upload+display+fallback, the full
  request lifecycle end-to-end, mobile drawer behavior, cross-user access
  denial via the SDK, an admin switching portals and staying put after
  saving equipment. No browser-automation tool exists in this
  environment and I was not given (and should not be given) real
  session credentials.
