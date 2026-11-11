# 2026-11-09 — Fixed 42P17 infinite recursion between items/categories RLS

## Root cause (traced precisely)

`0007_item_history_visibility.sql` added a historical-visibility clause to
`items_select` that reads `categories` (to check the item's category is
active), **and** a clause to `categories_select` that reads `items` (to
check whether one of the caller's own requests touches an item in that
category). Both tables have RLS enabled, so:

```
categories_select  --(reads)-->  items
       ^                           |
       |                      (reads, via items_select)
       +---------------<-----------+
```

Postgres detects this as a structural cycle at query-rewrite time —
**regardless of which `OR` branch would actually be true for a given
row** (the planner can't know that without already having resolved the
cycle) — and raises `42P17 infinite recursion detected in policy for
relation categories` the moment anything selects from either table.

## Fix: `supabase/migrations/0008_fix_catalog_rls_recursion.sql`

Moved every cross-table read into a narrowly-scoped `SECURITY DEFINER`
function: `is_category_active(uuid)`, `has_own_request_for_item(uuid)`,
`has_own_request_for_category(uuid)`. Each executes as its owner — the
same role that owns `items`/`categories`/`requests`, since all were
created in the same migration session — and Postgres exempts a table's
owner from that table's own RLS policies (no `FORCE ROW LEVEL SECURITY`
is used anywhere in this project). So a read inside one of these
functions never re-enters RLS at all: the cycle is broken structurally,
not by hoping the planner short-circuits it (which is exactly what 42P17
says it won't do).

Each function discloses the absolute minimum — one boolean about a
specific id the caller already has, never another user's identity or any
other column — `authenticated`-only execute grant, fixed `search_path`,
no writes. Same review bar as the 0006 functions.

`items_select`/`categories_select` were recreated against these
functions instead of a direct `EXISTS (... FROM categories/items ...)`.
Same intended visibility as 0007 — active-only browsing for members,
historical access via one's own requests, full access for admins — just
no longer wired as a live cross-table cycle.

## No frontend code changed

The query shapes `items.api.ts`/`categories.api.ts` send are unchanged —
this is purely a server-side RLS implementation fix.

## How to verify after running `0008_fix_catalog_rls_recursion.sql`

In the SQL Editor:

```sql
-- 1. The three new functions exist (expect 3 rows):
select proname from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('is_category_active', 'has_own_request_for_item', 'has_own_request_for_category');

-- 2. The policies no longer reference the other table directly — expect
--    to see is_category_active(...)/has_own_request_for_...(...) in the
--    expression, not a raw "FROM categories"/"FROM items" subquery:
select polname, pg_get_expr(polqual, polrelid) as using_expr
from pg_policy
join pg_class on pg_class.oid = polrelid
where relname in ('items', 'categories') and polname in ('items_select', 'categories_select');
```

Then in the app: reload `/member/catalog` (as a member, and as the admin
browsing the member portal) and `/admin/catalog` — the
"تعذّر تحميل كتالوج المعدات" error should be gone and the equipment you
added earlier should now actually appear.

## Verification actually run

`npm run typecheck` / `lint` / `build` / `test` all still pass (unchanged,
since no frontend code was touched — expected, since this is a pure SQL
fix).

**Not verified**: the actual query against the live database — I have no
credentials to run SQL against your project, and no browser-automation
tool exists in this environment to exercise `/member/catalog` myself.
Please run the verification queries above and reload the app, then tell
me what you see.
