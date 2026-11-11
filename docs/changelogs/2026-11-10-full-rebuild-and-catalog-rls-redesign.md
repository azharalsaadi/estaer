# 2026-11-10 — Full rebuild from scratch; catalog RLS redesigned (not re-patched)

> **Superseded, 2026-11-08**: the `0011_simplify_catalog_visibility.sql`
> migration described below was a hypothesis, never applied to the live
> project, and has been deleted from the repo. A direct SQL Editor test
> under the authenticated member role (requested by the user before any
> further rebuild work) found the *actual* confirmed cause: a self-
> recursion inside `is_admin()` itself, unrelated to the items/categories
> cross-table cycle this file assumed. See
> [2026-11-08-fix-is-admin-recursion.md](./2026-11-08-fix-is-admin-recursion.md)
> for the confirmed root cause and the real fix
> (`0011_fix_is_admin_recursion.sql`, reusing the freed `0011` slot). The
> rebuild process, architecture, and spec audit described below are still
> accurate; only the catalog-RLS section is not.

## Why a rebuild instead of a fifth patch

Three successive migrations (`0008` SECURITY DEFINER functions, `0009`
PLPGSQL to defeat inlining, `0010` PUBLIC execute revocation) each fixed
a real, narrow bug in the `items_select`/`categories_select` RLS cycle,
but each fix uncovered a different failure mode in the same underlying
design: two RLS-protected tables with policies that read each other.
Rather than attempt a fourth patch on unconfirmed live evidence, this
rebuild replaces the design itself.

## Process: backup → isolated build → verify → swap

1. Backed up the pre-rebuild `web/` to `web.pre-rebuild-backup/`
   (source/config only; verified all 142 files match the original).
2. Built the replacement in an isolated `web-rebuild/` directory —
   same stack, same features, same Supabase project, same
   `.env.local` — so nothing user-facing changed except the fix below.
3. Verified `web-rebuild/` in isolation (typecheck, lint, test, build,
   and an HTTP smoke test against 10 key routes on a scratch port)
   before touching the live `web/`.
4. Swapped `web-rebuild/`'s source/config over `web/` (a `node_modules`
   file lock from a live process prevented a clean directory
   replacement, so the existing `node_modules` — `package.json` is
   byte-identical — was reused; it turned out to have been partially
   corrupted by the interrupted removal, surfacing as `TS2688: Cannot
   find type definition file for 'vite/client'`/`'node'`, fixed with a
   clean `rm -rf node_modules && npm install`, 469 packages).
5. Re-ran the full verification suite directly in the final `web/`
   (see below) and started it on port 5180 as required.

No Supabase project, account, role assignment, or existing data was
touched or reset at any point. No credentials were requested or used.

## The actual fix: `items_select`/`categories_select` → `using (true)`

New migration: `0011_simplify_catalog_visibility.sql` (**not yet applied
to the live project — this is the one remaining action**).

The insight: category/item names, serial numbers, and active flags are
not confidential — nothing in the spec asks to hide them from any
signed-in employee. Only `requests`, `comments`, and
`request_status_history` need per-row visibility rules. Once catalog
tables stop trying to restrict *which rows* are visible based on
*another table's* contents, there is no cross-table reference left in
either policy — and therefore no cycle, regardless of planner inlining,
execute grants, or any other Postgres implementation detail that each
earlier patch had to reason about individually.

```sql
drop policy if exists items_select on public.items;
create policy items_select on public.items for select to authenticated using (true);

drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories for select to authenticated using (true);

drop function if exists public.is_category_active(uuid);
drop function if exists public.has_own_request_for_item(uuid);
drop function if exists public.has_own_request_for_category(uuid);
```

Deactivated items/categories are now visible to every signed-in user at
the row level (unchanged: the frontend still filters active-only for
members in the catalog browse view, same as before; admins already saw
everything).

Confirmed by grep that no other policy, function, or frontend code
referenced `is_category_active`, `has_own_request_for_item`, or
`has_own_request_for_category` before dropping them.

## Full spec re-audit against the restated rebuild instructions

Re-checked every requirement in the rebuild request against the
rebuilt code; everything was already correct from prior sessions except
the catalog RLS design above:

- **Auth**: signed-out users reach only `/login`/`/admin/login`;
  `resolvePostLoginDestination` returns to a role-appropriate requested
  page or role home; sign-out in both top bars; admin/member areas
  fully separate, admins retain member access, members cannot see admin
  nav or open admin routes (`adminLayoutRoute` guard).
- **Catalog**: category/item CRUD via dialogs, unique serial, active
  switch, deactivation hides from member browse while preserving
  records/history, optional images with fallback. Unchanged.
- **Requests**: date range + reason; `create_request` enforces
  availability server-side (unique partial index prevents concurrent
  double-booking); `update_request_status` enforces
  `pending→approved→returned` / `pending→rejected` only; My Requests is
  own-only, All Requests is admin-only; status/category filters live in
  the URL on both; detail view shows info + status history + comments.
  Unchanged.
- **Dashboard**: one `dashboard.api.ts` function scoped by RLS serves
  both portals (member sees own, admin sees all pending/on-loan/
  overdue). Unchanged.
- **Architecture**: feature folders, `supabaseClient` imported only
  from `lib/supabaseClient.ts` and feature `apis/*.api.ts` files, no
  page/component calls Supabase directly. Unchanged.
- **UI**: loading/empty/error via `StatePanel`, field-level form
  validation, `Sheet` drawer under the small-screen breakpoint, single
  theme, Estaer branding, Arabic/English RTL/LTR via `radix-ui`'s
  `Direction`. Unchanged.
- **TypeScript**: grepped `src/` for `any` — zero actual usages.

## Verification actually run (in the final `web/`, after the swap)

```
npm run typecheck   → passed
npm run lint         → passed, 0 errors (3 pre-existing informational warnings)
npm run build        → passed
npm run test         → passed, 31/31
```

Dev server started on **port 5180** as required; curled 10 key routes
(`/`, `/login`, `/admin/login`, `/member`, `/member/catalog`,
`/member/requests`, `/admin`, `/admin/catalog`, `/admin/categories`,
`/admin/requests`) — all returned HTTP 200 (SPA shell serving
correctly; this confirms routing/build health, not authenticated
behavior or live data).

## Not verified (needs you)

- **The one required action**: run
  `supabase/migrations/0011_simplify_catalog_visibility.sql` in the SQL
  Editor against the live project. Then, as a signed-in member, reload
  `/member/catalog` and confirm active equipment renders without error
  — this is the fix for "the old app had a failing `items` request
  under member permissions."
- Everything that needs a real authenticated browser session: catalog
  cards/images actually rendering, the full add→request→approve→return
  workflow end-to-end with separate admin/member sessions, rejection,
  URL filters, mobile drawer behavior, and direct-Supabase-access
  denial for a member attempting another user's data. No
  browser-automation tool and no authenticated credentials exist in
  this environment.

## Housekeeping

- `web.pre-rebuild-backup/` — intentional recoverable backup of the
  pre-rebuild app; safe to delete once you've confirmed the rebuilt app
  is working, otherwise worth keeping for a while.
- `web-rebuild/` — isolated staging directory used to build and verify
  before the swap; functionally empty now except a `node_modules`
  subfolder a live process held a lock on during cleanup. Safe to
  delete manually once no process is using it.
