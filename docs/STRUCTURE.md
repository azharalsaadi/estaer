# Structure & Conventions

Reference for file/folder organization: `../../FRONTEND_STRUCTURE_PROMPT.md`
(naming/organization only — its backend assumptions do not apply; see
`../AGENT.md`).

## Folder layout (current, Phase 2)

```
web/
├── AGENT.md
├── docs/
│   ├── STRUCTURE.md
│   ├── DESIGN_SYSTEM_REFERENCE.md
│   └── changelogs/
├── public/
│   ├── favicon.svg
│   └── assets/            # estaer-logo.png + equipment svgs, copied from
│                           # the design handoff (handoff folder untouched)
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── router/
    │   ├── index.tsx
    │   ├── root.route.tsx
    │   ├── public.routes.tsx
    │   └── protected.routes.tsx
    ├── features/
    │   ├── auth/           # login UI only — no Supabase calls yet
    │   ├── dashboard/       # member home hero + stats, admin overview
    │   ├── catalog/         # placeholder routes (member/admin)
    │   └── requests/        # placeholder routes (member/admin)
    ├── components/
    │   ├── ui/              # shadcn primitives — CLI-managed, see
    │                         # DESIGN_SYSTEM_REFERENCE.md for manual fixes
    │   ├── layout/           # MemberShell, AdminShell, navConfig.ts,
    │   │                     # LanguageToggleButton, LogoutButton
    │   └── shared/            # FullPageSpinner, ComingSoonPanel,
    │                           # NotFoundPage — each used by 2+ features
    ├── hooks/                # useLanguageToggle, useDocumentTitle, useIsMobile
    ├── lib/                  # utils.ts (cn), queryClient.ts
    └── i18n/
        ├── index.ts
        └── locales/{en,ar}.json
```

Not created yet (intentionally — not needed by any phase so far, per "only
create what the current task needs"):

- `src/constants.ts` — no app-wide constant exists yet.
- `src/types/api.types.ts` — no API call exists yet; arrives in Phase 3
  with the Supabase access layer.
- `lib/apiClient.ts` — only created if/when a real HTTP backend replaces
  Supabase. Do not create a Supabase client module as a "for later"
  placeholder either; it lands in Phase 3 together with its first caller.

## Feature module anatomy

Each feature under `src/features/<name>/` only has the subfolders it
currently needs:

```
features/<name>/
├── apis/                 # one file per resource — not present until Phase 3
├── hooks/                # one hook per query/mutation — Phase 3+
├── components/           # feature-local components
├── routes/
│   ├── <page>.route.tsx  # createRoute() only — no JSX, no logic
│   └── <page>.page.tsx   # default export `<Name>Page`
├── <name>.types.ts       # added when the feature has its own data shapes
├── <name>.schema.ts       # zod schemas (auth has one: auth.schema.ts)
└── <name>.constants.ts    # added when a feature needs magic-number-free lists
```

Dependency direction (never skipped):
`page → components → hooks → apis → access layer → Supabase client`.
In Phase 2 there are no `apis/`/`hooks/` yet because no feature talks to a
backend yet — pages compose components directly.

## Two portals, one navConfig

`components/layout/navConfig.ts` exports `MEMBER_NAV_ITEMS` and
`ADMIN_NAV_ITEMS` as two **separate flat lists** — not one role-filtered
list. The reference template's `NavItem.allowedRoles` field is dropped:
Member and Admin are separate route layouts (`memberLayoutRoute` /
`adminLayoutRoute`), so the portal itself is the separation, not a role
filter inside a shared nav array. This is a deliberate deviation, driven by
REQUIREMENTS.md §4 ("no combined sidebar").

Page titles and nav labels share the same i18n keys (`nav.*`) — there is no
second `titles.*` map duplicating them. Only the two login pages, which
aren't part of either nav, use a small dedicated `titles.login` /
`titles.adminLogin`.

## Router

- `root.route.tsx` — bare root, just `<Outlet />`.
- `public.routes.tsx` — pathless layout for signed-out screens (today: the
  two login routes only). The Member home is **not** here — it's protected.
- `protected.routes.tsx` — two pathless layout branches, `memberLayoutRoute`
  and `adminLayoutRoute`, each rendering its shell around `<Outlet />`.
  **Phase status**: neither branch checks auth or role yet — that is
  Phase 3's "one shared authentication boundary" (REQUIREMENTS.md §9). Do
  not read the current unguarded state as access control.
- `router/index.tsx` — assembles the tree, adds a `/` → `/member` redirect,
  and sets `defaultPendingComponent`/`defaultNotFoundComponent`.

`redirect()` in the installed `@tanstack/react-router` version returns a
`Response` and throws internally when called with `{ throw: true }` — it is
not thrown by the caller (`redirect({ to: "/member", throw: true })`, not
`throw redirect(...)`). Older examples using `throw redirect(...)` are out
of date for this dependency version.

## Phase 2 deviations from shadcn CLI defaults

Documented here per the "keep `components/ui/` CLI-managed, document
necessary fixes" rule (also see `DESIGN_SYSTEM_REFERENCE.md`):

- The installed shadcn CLI (Nova preset) generates files importing
  `cn` from a published `cn` npm package and uses `radix-ui`'s consolidated
  export. We removed the `cn` package and point every `ui/*.tsx` import at
  `@/lib/utils`, which defines `cn()` with `clsx` + `tailwind-merge`
  ourselves, per the explicit project requirement. Re-running
  `npx shadcn add <component>` will reintroduce `from "cn"` — fix the
  import before committing.
- This CLI/preset ships no `form.tsx` (`shadcn add form` resolves to "no
  files"). Forms are built directly with `react-hook-form` +
  `components/ui/{input,label}` and manual i18n-keyed error text, not a
  `Form`/`FormField` wrapper.
- `components/ui/sheet.tsx`'s `side` prop only accepts physical
  `top|right|bottom|left` (not logical `start|end`) even with `rtl: true`
  in `components.json`. Both mobile drawers (Member nav, Admin sidebar) use
  physical sides (`right`, `left`) as shipped — revisit if a future design
  pass wants the drawer to open from the reading-start edge in RTL.
