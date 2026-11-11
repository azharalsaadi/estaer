# 2026-11-07 — Phase 3: Supabase schema, approved-employee access, OTP/session, permissions

## Scope

Full database schema (all 7 tables from the Phase 1 plan) + RLS + grants,
approved-employee provisioning, and a real, working email-OTP sign-in with
a centralized router auth guard. **Deliberately not included**:
`create_request()`/`update_request_status()` and any other
reservation/transition business logic — those land with the Requests
feature (a later phase), once there is a form that actually calls them.
Catalog/request browsing UI also stays out of scope; only the auth-facing
screens built in Phase 2 were wired to real data.

## Correction to docs/STRUCTURE.md

STRUCTURE.md's router section currently states `redirect()` "is not thrown
by the caller." That turned out to be incomplete: `redirect({ ..., throw:
true })` does throw internally, but its return type is still statically
`Redirect` (not `never`), so TypeScript cannot narrow past it — a `beforeLoad`
that checks `if (!user) { redirect({...,throw:true}) }` then reads
`user.role` on the next line fails to typecheck. The actual code here uses
`throw redirect({...})` (a literal `throw` statement, for correct
narrowing) with a scoped `eslint-disable` comment, since `redirect()`
returns a `Response`, not an `Error`, and the generic
`only-throw-error` rule doesn't know about this framework-specific
convention. Fold this correction into STRUCTURE.md in the next docs pass.

## What was created

**Environment**

- `.env.example` (placeholders, safe to commit) and `.env.local` (blank,
  git-ignored via the existing `*.local` rule) with `VITE_SUPABASE_URL`
  and `VITE_SUPABASE_PUBLISHABLE_KEY`. Both are intentionally public
  (bundled into the browser) — the publishable key is the low-privilege
  key, never the secret/service-role key.

**SQL migrations** (`supabase/migrations/`, run manually in the SQL
Editor — no Supabase CLI involved this phase):

- `0001_schema.sql` — enums (`user_role`, `request_status`), all 7 tables,
  the `requests_one_active_reservation_per_item` unique partial index
  (the exclusive-reservation rule, enforced atomically at the DB level —
  no reservation _logic_ exists yet, but the constraint that will make it
  race-safe once that logic is added does).
- `0002_grants.sql` — explicit least-privilege grants. This project has
  "Automatically expose new tables" disabled, so nothing is reachable via
  the Data API without an explicit `GRANT` here — confirmed against
  current Supabase docs, there is no separate dashboard toggle on top of
  this. `anon` gets nothing, anywhere. `authenticated` gets read-only on
  `requests`/`request_status_history` (writes will arrive as SECURITY
  DEFINER functions with the Requests feature), read+write on
  `categories`/`items` (RLS-checked, no function needed), read+insert on
  `comments`, read-only on `profiles`. `approved_employees` gets no
  grants to anyone.
- `0003_rls.sql` — `is_admin()` helper (SECURITY INVOKER — reads only the
  caller's own row, so it cannot itself become an escalation path) + RLS
  policies on every table (own-row/admin visibility, active-only catalog
  visibility for members per REQUIREMENTS.md §13).
- `0004_auth_provisioning.sql` — `handle_new_user()` (trigger on
  `auth.users`, copies the role from `approved_employees` into
  `profiles`) and `hook_restrict_employee_signup()` (the "Before User
  Created" Auth Hook function — rejects account creation outright for any
  non-approved email, confirmed against current Supabase Auth Hooks docs
  for the exact payload/return shape).
- `supabase/seed_approved_employees.example.sql` — template only, not
  auto-applied. The user edits it with real emails and runs it themselves;
  no fake/sample employee data was inserted by me.

**Access layer**

- `lib/supabaseClient.ts` — the only module calling `createClient`; throws
  a clear error at import time if the env vars are missing (expected
  behavior until `.env.local` is filled in — not a bug).
- `lib/database.types.ts` — a hand-written, minimal `Database` generic
  (just `profiles` so far) so `.from("profiles")` is fully typed without
  needing the Supabase CLI's `gen types`. Grows per table as a feature
  starts querying it; swap for CLI-generated output later if desired.
- `types/api.types.ts` — `APIError` (`code` + diagnostic `message`) and
  the first `ApiErrorCode` union: `NOT_APPROVED_EMPLOYEE`,
  `OTP_INVALID_OR_EXPIRED`, `RATE_LIMITED`, `NETWORK_ERROR`, `UNKNOWN`.
- `features/auth/apis/auth.api.ts` — `requestOtpApi`, `verifyOtpApi`,
  `getSessionUserApi`, `subscribeToAuthChangesApi`, `signOutApi`. Verified
  against the installed `@supabase/supabase-js` source: `AuthError`/
  `PostgrestError` both extend `Error` and are re-exported from the
  top-level package, so error normalization uses `isAuthError()` rather
  than duck-typing. There is no stable `code` for an Auth-Hook rejection,
  so matching the approved-employee rejection is a documented best effort
  on `status === 403` + the exact message set in `0004_auth_provisioning.sql`
  — revisit if Supabase adds a dedicated code.
- `features/auth/hooks/{useAuth,useRequestOtp,useVerifyOtp,useSignOut}.ts`.
  `useAuth`'s query uses `staleTime: Infinity` deliberately — the only
  authoritative updates come from the `onAuthStateChange` subscription's
  push via `setQueryData`, not from React Query's own refetch heuristics.
  `useSignOut` calls `queryClient.clear()` (the whole cache, not just the
  auth entry) on success.
- `features/auth/lib/safeRedirect.ts` — validates the post-login
  `redirect` search param so it can only point inside the app (open-redirect
  prevention); each protected layout still independently re-checks
  auth/role regardless of where this points.

**Router auth guard**

- `router/root.route.tsx` now uses `createRootRouteWithContext` so
  `beforeLoad` can reach the shared `queryClient`.
- `router/protected.routes.tsx` — the one shared boundary
  (REQUIREMENTS.md §9): `memberLayoutRoute.beforeLoad` requires any
  authenticated user; `adminLayoutRoute.beforeLoad` requires authenticated
  **and** `role === "admin"`, redirecting a signed-in non-admin to a real
  `/access-denied` page (not a silent bounce) rather than `/admin/login`,
  since they're already signed in. Both use
  `context.queryClient.ensureQueryData` against the exact query key
  `useAuth()` reads, so there is no duplicate fetch and no protected
  content mounts before the check resolves (the router's
  `defaultPendingComponent` covers the wait).
- Both login routes (`member-login.route.tsx`, `admin-login.route.tsx`)
  gained a validated `redirect` search param.
- `LoginForm` now calls the real hooks: email step → `useRequestOtp`,
  code step → `useVerifyOtp`, a real 60-second resend cooldown (matches
  Supabase's documented OTP rate limit), and errors rendered via
  `serverErrors.<code>` with the `default` fallback — never a raw
  Supabase message.
- `LogoutButton` now actually calls `signOutApi` (via `useSignOut`) and
  clears the query cache before navigating, instead of just linking to
  the login page.
- `MemberShell`/`AdminShell` now show the real signed-in email next to
  the avatar/portal label (via `useAuth()`) — the first real (non-fake)
  data the UI has displayed.

## What you still need to do in Supabase (not something I can do for you)

1. Run `supabase/migrations/0001_schema.sql` through `0004_auth_provisioning.sql`,
   in that order, in the SQL Editor.
2. Edit `supabase/seed_approved_employees.example.sql` with your own real
   email(s) — at least your own, as `admin` — and run it in the SQL
   Editor.
3. Dashboard → Authentication → Hooks → "Before User Created" → select
   the `hook_restrict_employee_signup` function → enable it.
4. Dashboard → Authentication → Email Templates → "Magic Link" template:
   by default this template only contains a clickable link, not the
   6-digit code our UI asks for. Add `{{ .Token }}` to the template body
   (e.g. `Your code: {{ .Token }}`) so the email actually contains a code
   to type in.
5. Fill in `web/.env.local` with your Project URL (Settings → Data API)
   and publishable key (Settings → API Keys).

## Verification actually run

```
npm run typecheck   → passed
npm run lint        → passed, 0 errors, same 2 pre-existing shadcn warnings
npm run build       → passed
```

**Not verified** (requires the user's real Supabase project, which I was
not given credentials for and should not be): the migrations actually
running without error against a live database, the Auth Hook actually
rejecting an unapproved email, an approved employee actually receiving
and completing a real OTP sign-in, the role guard's actual redirect
behavior in a real browser, RLS actually blocking cross-user access via
the SDK. All of this is designed and code-reviewed against current
Supabase documentation (fetched live this session, since some of it —
publishable keys, the Data API exposure change, the exact Auth Hook
payload/return shape — postdates general training knowledge), but "the
code is correct per the docs" is not the same claim as "it was run and
passed." See the next phase for how to exercise it together.

## Deferred

`create_request()`, `update_request_status()`, any comment-posting UI,
and the catalog/requests browsing screens that will actually call all of
the above — all explicitly out of scope for this phase, land with Phase 4
(catalog) and Phase 5 (requests/reservations).
