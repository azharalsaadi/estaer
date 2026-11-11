# 2026-11-08 — Public member landing page, sign-in on demand, language toggle on the login screen

## Member home becomes dual-mode: public landing + authenticated dashboard

`memberLayoutRoute`'s guard (`src/router/protected.routes.tsx`) previously
redirected every signed-out visitor away from *any* `/member/*` path,
including the bare home page. Now it only redirects when the path is
something other than `/member` itself:

```ts
const isPublicMemberHome = location.pathname === "/member"
if (!user && !isPublicMemberHome) {
  throw redirect({ to: "/login", search: { redirect: location.href } })
}
```

Every other member route (`/member/catalog`, `/member/requests`, the
request-detail route, `/access-denied`) is untouched — still redirects a
signed-out visitor to `/login` exactly as before. The bare `/` route
already resolved a signed-out visitor to `/member` (unchanged), so a
first-time visitor now lands on the public landing page automatically.

`member-home.page.tsx` branches on `useAuth().isAuthenticated`:
- **Signed in**: `<MemberHero/>` + `<StatsRow/>` — unchanged, same
  component, same `useDashboardStats()` query, real numbers.
- **Signed out**: `<MemberHero/>` (already pure marketing copy, no
  personal data) + a new `<GuestStatsRow/>` — the same three cards,
  same labels, hardcoded to `0` with `isLoading={false}`. This is a
  *separate* component rather than a flag on `StatsRow`, specifically so
  `useDashboardStats()` (which queries the RLS-protected `requests`
  table, and is also reused as-is by the admin dashboard) is never
  called at all for a signed-out visitor — no request fires, so there is
  nothing to fail or leak. There is no separate "personal requests list"
  block on this page beyond the stats cards, so nothing else needed
  hiding.

`MemberShell` (the header rendered for both states) now shows a **Sign
in** button instead of **Sign out** when there's no session
(`SessionAction`, both the desktop header and the mobile drawer), and
only shows the user's email/avatar when one exists — previously the
avatar badge rendered unconditionally even with no user. `LogoutButton`
now navigates to `/member` after signing out (was `/login`) — correct
now that `/member` is the public landing page sign-out should return to,
not a dead end that would've bounced back through the login redirect
before.

## Language toggle: traced the actual mechanism, found it correctly wired — fixed the one real gap

Traced end-to-end: `App.tsx` mounts `useLanguageToggle()` once at the
root and feeds `isArabic` into `radix-ui`'s `Direction.Provider`;
`useLanguageToggle` subscribes to `i18n.language` via
`useTranslation()` (reactive — re-renders on change), sets
`document.documentElement.lang`/`dir`, and `i18next-browser-
languagedetector` is configured with `caches: ["localStorage"]`, so
`i18n.changeLanguage()` persists automatically and survives a refresh.
`LanguageToggleButton` is a single shared component already rendered
unconditionally in `MemberShell`'s header (so it's already present and
functional on both the public landing page and every signed-in member
page) and in `AdminShell`. No conflicting second writer of `dir`, no
stale closures, no custom Tailwind RTL override found.

The one concrete gap: **the login/OTP page had no language control at
all** — a visitor who reached `/login` without having toggled language
first (or who opened it directly) had no way to switch there. Added
`<LanguageToggleButton/>` to `member-login.page.tsx`'s header. This
closes the last of the three surfaces named in the task — landing page
and signed-in pages already had it via `MemberShell`; OTP screens did
not until now.

## Verification

```
npm run typecheck   → passed
npm run lint         → passed, 0 errors (3 pre-existing informational warnings)
npm run test         → passed, 37/37 (unchanged — no new pure-logic unit
                        to add here; this is routing/auth-state/DOM
                        behavior, consistent with this project's existing
                        test scope)
npm run build        → passed
```

HTTP smoke test against the running dev server (port 5180): `/`,
`/member`, `/login`, `/member/catalog`, `/member/requests`, `/admin`,
`/admin/login` all return 200 — confirms routing/module resolution is
intact, **not** the actual signed-out/signed-in rendering or redirect
behavior, since `curl` doesn't execute client-side React/router logic.

## Not verified — needs a real browser session

No browser automation exists in this environment. Specifically unverified:
- A signed-out visitor actually sees zeroed stats and no personal data
  on `/member`, with no `requests` query firing (checkable via the
  Network tab — there should be no request to that table at all while
  signed out).
- Clicking **Sign in** opens the OTP form, and verifying lands back on
  the authenticated `/member` with real stats.
- Signing out returns to the public `/member` landing page with the
  guest view, not a blank/error state.
- Visiting `/member/catalog` or `/member/requests` while signed out
  still redirects to `/login` (the one path this change deliberately
  did *not* exempt).
- Selecting **العربية**/**English** actually flips text and layout
  direction in both directions, and that the choice survives navigating
  landing → login/OTP → signed-in home, and a hard refresh at each step.
