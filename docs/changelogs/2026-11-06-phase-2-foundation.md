# 2026-11-06 — Phase 2: project foundation, theme, i18n, portal layouts

## Scope

Project scaffold only. No Supabase, no real authentication, no borrowing
logic — explicitly out of scope for this phase per the user's instruction.

## What was created

- Vite + React 19 + strict TypeScript app in `web/`, created via
  `npm create vite@latest web -- --template react-ts`, then stripped of all
  template boilerplate (demo `App.tsx`, default CSS, sample assets).
- Tailwind CSS v4 (`@tailwindcss/vite`) + shadcn/ui (`style: radix-nova`,
  `-b radix --rtl --css-variables`, preset `nova`). Added primitives:
  `button`, `card`, `badge`, `separator`, `sheet`, `dropdown-menu`,
  `avatar`, `skeleton`, `input`, `label`. (`form` does not exist in this
  preset — see `docs/STRUCTURE.md`.)
- `@` → `./src/*` path alias in `vite.config.ts`, `tsconfig.app.json`, and
  `tsconfig.json` (the last one only so the shadcn CLI's workspace
  resolver could find it — it isn't used for actual compilation since the
  root config has `"files": []`).
- ESLint flat config (`typescript-eslint`, `eslint-plugin-react-hooks`,
  `eslint-plugin-react-refresh`), replacing the template's default
  `oxlint`. Prettier + `prettier-plugin-tailwindcss`.
- `npm run typecheck` set to `tsc -b --noEmit` (not plain `tsc --noEmit`,
  which would check the empty solution-style root config and pass
  vacuously — verified this by injecting a deliberate type error and
  confirming the command catches it before removing the probe file).
- i18n: `src/i18n/index.ts` + `locales/{en,ar}.json`, both with identical
  key sets (`common`, `titles`, `nav`, `topbar`, `fields`, `validation`,
  `serverErrors`, `auth`, `dashboard`, `home`, `adminOverview`, `catalog`,
  `requests`, `adminCatalog`).
- Shared hooks: `useLanguageToggle` (sets `<html lang/dir>`, mounted once
  in `App.tsx`), `useDocumentTitle`, `useIsMobile`.
- Router: code-based TanStack Router (`root.route.tsx`,
  `public.routes.tsx`, `protected.routes.tsx`, `index.tsx`), with separate
  `memberLayoutRoute`/`adminLayoutRoute` branches. **No auth guard yet** —
  documented inline in `protected.routes.tsx` and in `AGENT.md`.
- `components/layout/`: `MemberShell`, `AdminShell` (sidebar that becomes a
  `Sheet` drawer under `lg:`), `navConfig.ts` (two separate flat nav
  lists), `LanguageToggleButton`, `LogoutButton` (navigates only — no
  Supabase sign-out call exists yet).
- `components/shared/`: `FullPageSpinner` (router's pending component),
  `ComingSoonPanel` (used by catalog + requests placeholders),
  `NotFoundPage` (router's 404).
- Features scaffolded with only what Phase 2 needs:
  - `auth`: `auth.schema.ts` (Zod `loginSchema`/`otpSchema`), `LoginForm`
    (two-step email → code UI, **does not call Supabase and does not
    grant access** — see below), routes for `/login` and `/admin/login`.
  - `dashboard`: `MemberHero`, `StatsRow`/`StatCard` (render `—`, not a
    fabricated number — see below), routes for `/member` and `/admin`.
  - `catalog`: placeholder routes for `/member/catalog`, `/admin/borrow`,
    `/admin/catalog`, `/admin/categories`.
  - `requests`: placeholder routes for `/member/requests`,
    `/admin/requests`, `/admin/my-requests`.
- Brand assets copied into `public/assets/` from the design handoff
  (handoff folder itself untouched).
- `index.html` title set to "Estaer"; favicon points at the logo PNG.

## Explicit "not real" boundaries (per the user's instruction)

- `LoginForm` never calls any backend and never navigates to a protected
  route on submit. Step 2 (code entry) ends in a static
  "sign-in is not connected yet" note, not a simulated grant of access.
- `StatCard` renders `—` instead of a number, with a note under the row
  explaining live counts arrive once Supabase is connected. No fabricated
  pending/on-loan/overdue counts are shown anywhere.
- `memberLayoutRoute`/`adminLayoutRoute` render their shells
  unconditionally — this is **not** access control. A member can currently
  reach `/admin/*` by URL; that gap closes in Phase 3, not before.

## Verification actually run

```
npm run typecheck   → passed (tsc -b --noEmit; sanity-checked against a
                       deliberately broken probe file first)
npm run lint         → passed, 0 errors, 2 warnings (both from shadcn's own
                       unmodified button.tsx/badge.tsx exporting both a
                       component and its cva variants from one file — an
                       accepted, CLI-standard pattern, left as-is)
npm run build        → passed, code-split per lazy route
```

Smoke-tested with the dev server (`npm run dev`, port 5180): `curl`'d every
Phase 2 route (`/`, `/member`, `/member/catalog`, `/member/requests`,
`/login`, `/admin`, `/admin/login`, `/admin/requests`, `/admin/catalog`,
`/admin/categories`, `/admin/borrow`, `/admin/my-requests`,
`/assets/estaer-logo.png`) — all returned HTTP 200, no transform errors in
the dev server log. **Not verified**: actual visual rendering in a real
browser, RTL layout correctness, mobile drawer behavior, keyboard
navigation/focus — no browser-automation tool was available in this
environment this session. The user should open `http://localhost:5180`
themselves to confirm the visual result before this is considered done.

## Known, accepted dependency advisories (dev-only)

`npm audit` reports moderate/low findings in `eslint`/`typescript-eslint`'s
`minimatch` (ReDoS) and the `shadcn` CLI's `deepmerge` (prototype
pollution). Both are dev-time tooling only — neither ships in the
production bundle. Not force-upgraded this phase to avoid an
unreviewed breaking change to the lint config; revisit in a dedicated
dependency-maintenance pass.

## Deferred to Phase 3

`src/types/api.types.ts`, `src/constants.ts`, `lib/apiClient.ts` (only if a
real HTTP backend ever replaces Supabase), the Supabase client module and
every `apis/*.api.ts` file, the auth guard in `protected.routes.tsx`, real
OTP sign-in, RLS, and real dashboard/catalog/request data.
