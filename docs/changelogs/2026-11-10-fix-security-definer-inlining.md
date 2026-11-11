# 2026-11-10 — Fixed 54001 stack-depth: SECURITY DEFINER functions were being inlined

## Trace

`0008`'s three new functions (`is_category_active`,
`has_own_request_for_item`, `has_own_request_for_category`) were each a
single-statement `LANGUAGE SQL` function. Postgres's planner is free to
**inline** a simple single-SELECT SQL-language function directly into the
calling query as an optimization. When that happens, the function body
is no longer executed as a genuine function call — it becomes part of
the *same* query plan, evaluated under the **original caller's**
privileges. That silently defeats `SECURITY DEFINER`'s privilege switch
(which only takes effect for an actual function invocation, per
PostgreSQL's own documentation on row security and definer functions),
so the cross-table read re-entered RLS under the member's own privileges
— exactly the same cycle as before `0008`, just hidden behind a function
name instead of a direct subquery.

That hiding is also why the error *shape* changed between the two
reports: Postgres's static cycle detector (`42P17`) inspects the rewritten
query at plan time and can prove a direct policy-to-policy cycle
immediately. Once the cycle was behind an (inlined-away) function call,
the planner no longer proves it statically — the same recursion only
surfaces at runtime, once the executor's call depth actually exhausts the
stack (`54001`).

## Fix: `supabase/migrations/0009_fix_security_definer_inlining.sql`

`LANGUAGE PLPGSQL` functions are never inlined by Postgres — there is no
PL/pgSQL inlining optimization, by design. A plpgsql function is always
invoked as a genuine function call, so its `SECURITY DEFINER` privilege
switch is always honored, and the cross-table read genuinely never
re-enters RLS. Converted all three `0008` functions, plus
`get_item_availability` from `0006` (same defect class — a single-
statement `SECURITY DEFINER SQL` function reading `items`/`requests`;
not the cause of this crash, since it doesn't participate in the
items/categories cycle, but if inlined it would silently see only the
caller's own requests instead of everyone's, understating how often an
item is actually reserved).

Logic, arguments, and return types are byte-for-byte identical — only the
`LANGUAGE` and an explicit procedural body changed. `CREATE OR REPLACE`
preserves the function's identity (OID), so the existing
`GRANT EXECUTE` and the policies calling these by name need no changes —
this migration is self-contained.

Nothing about RLS was disabled, no grant was widened, and
`max_stack_depth` was not touched, per the constraint — the recursion is
removed, not worked around.

## No frontend code changed

Same as `0008` — this is purely a server-side function-implementation
fix. The query shapes the frontend sends are unaffected.

## How to verify after running `0009_fix_security_definer_inlining.sql`

```sql
-- Expect lanname = 'plpgsql' for all four rows:
select p.proname, l.lanname
from pg_proc p
join pg_language l on l.oid = p.prolang
where p.pronamespace = 'public'::regnamespace
  and p.proname in (
    'is_category_active', 'has_own_request_for_item',
    'has_own_request_for_category', 'get_item_availability'
  );
```

Then reload `/member/catalog` as a signed-in member (and as the admin
browsing the member portal) — the catalog should load without the
`54001`/generic error, showing active equipment in active categories.

## Verification actually run

`npm run typecheck` / `lint` / `build` / `test` — all still pass (31/31),
unchanged, since no frontend code was touched.

**Not verified**: the actual query against the live database. I have no
credentials to run SQL or exercise an authenticated session against the
project, and no browser-automation tool exists in this environment.
Please run the migration, the verification query above, and reload the
app, then tell me what you see — including the console diagnostics added
in the previous session if anything still fails.
