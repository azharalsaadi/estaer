# 2026-11-07 — Phase 4: equipment catalog (member browse, admin manage)

## Scope

Member equipment browsing (active items in active categories) and admin
catalog/category management (create, edit, deactivate — never delete)
through dialogs. Admin's "Borrow equipment" page reuses the exact same
browsing view, since admins retain member abilities. No reservation or
request-creation logic — that is still Phase 5; equipment cards show no
"Request" action yet.

## Migration: none needed

Phase 3 already created the full `categories`/`items` schema, grants, and
RLS policies (member sees active-in-active-category rows only; admin sees
and writes everything; `anon` gets nothing). Verified this directly
against the live project this session (read-only, via `curl` with the
anon/publishable key — every table, including `items`/`categories`,
correctly returns `42501 permission denied` for the anon role, confirming
Phase 3's migrations were applied and no table is left unprotected):

```json
{"code":"42501","message":"permission denied for table items", ...}
```

Nothing in `supabase/migrations/` changed this phase.

## What was created

**shadcn primitives** (via CLI): `dialog`, `select`, `table`, `sonner`
(toast), `switch`. Re-fixed the `cn` package reintroduction (see Phase 2's
note in STRUCTURE.md — every `shadcn add` re-adds it; removed again and
repointed imports to `@/lib/utils`). Wired `<Toaster />` into `App.tsx`,
RTL-aware (`dir`/`position` follow the current language).

**Access layer** (`features/catalog/`)

- `apis/categories.api.ts` — `listActiveCategoriesApi`, `listAllCategoriesApi`,
  `createCategoryApi`, `updateCategoryApi`.
- `apis/items.api.ts` — `listActiveItemsApi`, `listAllItemsApi`,
  `createItemApi`, `updateItemApi`. The category join is done with two
  plain typed `select`s + an in-memory `Map`, not a Postgrest embedded
  resource (`select=*,categories(...)`) — deliberately, to stay fully
  typed against the hand-written `Database` generic without fighting its
  embedded-relationship inference. RLS still independently guarantees a
  non-admin never receives an inactive row regardless of this join
  strategy.
- `lib/catalogErrors.ts` — normalizes `PostgrestError` into `APIError`.
  Postgres auto-names an unnamed unique constraint `<table>_<column>_key`;
  matching on that name in a `23505` error's message tells us whether a
  duplicate _name_ or _serial number_ collided. Added `DUPLICATE_SERIAL_NUMBER`,
  `DUPLICATE_CATEGORY_NAME`, `FORBIDDEN` to `types/api.types.ts`'s
  `ApiErrorCode`.
- `lib/database.types.ts` extended with `categories`/`items` (including
  the `items_category_id_fkey` relationship).
- Hooks: `useActiveCategories`, `useAllCategories`, `useActiveItems`,
  `useAllItems`, `useCreateCategory`, `useUpdateCategory`, `useCreateItem`,
  `useUpdateItem`. Every mutation invalidates both `["categories"]` and
  `["items"]` (prefix match) — deactivating a category must also refresh
  what members see in the items list.

**UI**

- `EquipmentCard` — illustration from the four starter-category SVGs
  (cameras/laptops/projectors/cables) when the name matches, else a
  generic `Package` icon for any category an admin adds later.
- `CatalogBrowseView` — the active-items grid + category filter, shared
  by Member catalog and Admin "Borrow equipment" (not duplicated).
- `CatalogStatePanel` — feature-local loading/empty/error panel (shared
  across catalog's own three screens — not promoted to `components/shared/`
  yet, since no other feature uses it).
- `CategoryDialog` / `ItemDialog` — create+edit in one dialog each, per
  REQUIREMENTS.md §13. Dialog open/edit-target state lives in the route's
  URL search params (`dialog`, `itemId`/`categoryId`), `replace: true` on
  every change, per the required convention.
- `CatalogTabs` — links the two admin management routes (already existed
  independently since Phase 2).
- Admin catalog page gained a search box + visibility filter, also in the
  URL (`q`, `visibility`).

## A lint-driven design correction

The initial dialogs reset `react-hook-form` state in a
`useEffect(() => { reset(...); setServerErrorCode(null) }, [open, ...])`
on open. `eslint-plugin-react-hooks` v7's new `set-state-in-effect` rule
flagged this (correctly) as an avoidable cascading-render pattern. Fixed
by giving each dialog a `key` tied to its open/edit-target
(`` `${dialog}-${itemId ?? "new"}` ``) at the call site instead, so a
fresh mount — and therefore fresh `useForm` defaults and fresh local
state — happens every time it opens, with no reset effect needed at all.

## Verification actually run

```
npm run typecheck   → passed
npm run lint        → passed, 0 errors, same 2 pre-existing shadcn warnings
npm run build       → passed
```

Live-project smoke test (read-only, anon key, `curl`): confirmed
`categories`/`items`/`profiles`/`approved_employees`/`requests` all exist
and all correctly reject the anon role with `42501` — i.e., Phase 3's
migrations are genuinely live, not just present in the repo.

**Not verified**: the actual authenticated CRUD flows in a browser (no
browser-automation tool in this environment, and I should not fabricate
a session) — adding/editing/deactivating a category or item, the
unique-serial/unique-name error messages actually surfacing correctly,
and the member catalog genuinely hiding an item once its category is
deactivated. See the testing steps below for you to run these yourself.

## Deferred

A "Request equipment" action on `EquipmentCard` (needs the exclusive
reservation logic — Phase 5). `create_request()`/`update_request_status()`
and the `requests`/`comments`/`request_status_history` RLS write paths
remain exactly as Phase 3 left them (read-only for `authenticated`).
