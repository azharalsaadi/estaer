# 2026-11-09 — Root cause found and fixed: the auth guard refetched on every navigation

## Root cause

`router/protected.routes.tsx`'s `beforeLoad` guards called
`context.queryClient.ensureQueryData({ queryKey: AUTH_SESSION_QUERY_KEY,
queryFn: getSessionUserApi })` — **without** `staleTime`.
`features/auth/hooks/useAuth.ts`'s own `useQuery` for the exact same key
sets `staleTime: Infinity`, but that option is per-call, not owned by the
query key globally. React Query merges each caller's own options with the
`QueryClient`'s defaults (`lib/queryClient.ts` only sets `retry`/
`refetchOnWindowFocus`, no `staleTime`), so the library default of `0`
applied to the guard's call. Net effect: **every single navigation inside
`/admin/*` or `/member/*` — including the navigation that closes the
equipment dialog after a save — silently refetched the session and role
from the server**, defeating the "only update via the push subscription"
design documented right there in the comment, and opening a window for an
ordinary network-timing hiccup during that refetch to momentarily
miscompute the role and misroute the admin. This is a plausible root
cause for the save-then-misrouted-admin report; I could not reproduce it
live (no browser-automation tool in this environment) to prove it beyond
tracing the actual caching behavior.

Secondary issue: the bare `/` route (`router/index.tsx`) unconditionally
redirected everyone to `/member` regardless of role. Not itself the save
bug's trigger as far as I can tell, but it meant any navigation that
resolved to `/` sent an admin into the member portal with no say in it —
directly conflicting with "admins can open both portals and the app only
switches portals when they deliberately choose it."

## Fix

- `features/auth/hooks/useAuth.ts` now exports
  `AUTH_SESSION_QUERY_OPTIONS = { queryKey, queryFn, staleTime: Infinity }`
  as the one shared definition.
- `router/protected.routes.tsx`'s two `beforeLoad` guards now call
  `ensureQueryData(AUTH_SESSION_QUERY_OPTIONS)` — the literal same object,
  not a re-typed copy — so this class of drift can't reoccur silently.
- `router/index.tsx`'s index route now reads the cached role via the same
  shared options and redirects to `/admin` for an admin, `/member`
  otherwise, instead of unconditionally to `/member`.
- Added `features/auth/hooks/useAuth.test.ts` — asserts the shared options
  object actually has `staleTime: Infinity` and the shared key, as a
  regression guard.

## What this does NOT change

The actual security boundary (RLS, `is_admin()`, the admin-only RPC
checks) — untouched. This fix is about the router's UX-level role check
reading a stable, non-refetching value, not about data access permissions,
which were never affected by this bug.

## Verification actually run

```
npm run typecheck   → passed
npm run lint        → passed, 0 errors (3 pre-existing/informational warnings)
npm run build       → passed
npm run test        → passed, 22/22 (2 new tests added)
```

Dev server smoke test (`curl`, HTTP-shell level only): `/`, `/admin`,
`/member`, `/admin/catalog`, `/member/catalog` all return 200, no
transform errors in the dev log.

**Not verified**: the actual end-to-end behavior in a real browser — an
admin switching between `/admin` and `/member` without losing their role,
a member being denied `/admin/*`, and an admin staying on `/admin/catalog`
after saving equipment. No browser-automation tool exists in this
environment. Please verify these three yourself (ideally admin and member
in genuinely separate browser profiles, not two tabs of one profile —
Supabase syncs the session across tabs of the same profile by design,
which is unrelated to this fix and not a bug) and tell me if any of them
still fail — that would mean there is a second, distinct issue I haven't
found.
