# 2026-11-08 — Confirmed root cause: `is_admin()` self-recursion, not the items/categories cycle

## The evidence that finally unblocked this

The user ran the exact `/member/catalog` query (`categories`/`items`,
`active = true`) directly in the Supabase SQL Editor under a simulated
authenticated **member** session (`set local role authenticated` +
`request.jwt.claims`). It reproduced the failure:

```
ERROR: 54001: stack depth limit exceeded
CONTEXT: SQL function "is_admin" during startup
         SQL function "is_admin" statement 1 (repeated many times)
```

This is the one piece of evidence that was missing in prior sessions —
anon-key probing could prove schema/grant facts but could never exercise
real `authenticated`-role RLS evaluation. With this trace, the cause is
unambiguous: `is_admin()` is recursing into itself, not the
items/categories cross-table cycle that `0007`/`0008`/`0009` addressed.

## Root cause

`is_admin()` (`0003_rls.sql`) is `language sql`, `security invoker`, and
reads `public.profiles`:

```sql
select exists (
  select 1 from public.profiles
  where profiles.user_id = auth.uid() and profiles.role = 'admin'
);
```

`profiles` has its own SELECT policy, also from `0003`:

```sql
using (user_id = auth.uid() or public.is_admin())
```

So evaluating `is_admin()` scans `profiles`, which evaluates this policy
per row, which calls `is_admin()` again. The caller's own row satisfies
the policy's first branch and needs no recursion — but Postgres still
evaluates the policy against every *other* row the scan considers as
part of the same query, and every other employee's row fails that first
branch, forcing evaluation of the second (`is_admin()`) — which repeats
the identical unbounded scan again, once per other row. This project
always has at least one admin and one member profile, so this has been
latent since `0003` and was only waiting for a real multi-employee,
authenticated query to trigger it — which the catalog read did, since
`items_select`/`categories_select` both call `is_admin()` as their first
condition.

0009 fixed a real but different bug (the items↔categories helper
functions being inlined); it never touched `is_admin()`, which carried
this separate, deeper recursion the whole time.

## Fix

New migration: `supabase/migrations/0011_fix_is_admin_recursion.sql`
(reuses the `0011` slot — the prior `0011_simplify_catalog_visibility.sql`
draft chased the wrong hypothesis, was never applied anywhere, and has
been deleted; see the superseded-note added to
[2026-11-10-full-rebuild-and-catalog-rls-redesign.md](./2026-11-10-full-rebuild-and-catalog-rls-redesign.md)).

Converts `is_admin()` to the same pattern already proven correct for the
`0008`/`0009` catalog helper functions — `SECURITY DEFINER` +
`LANGUAGE PLPGSQL`:

- `SECURITY DEFINER` — runs as the function's owner, who also owns
  `profiles` and is therefore exempt from `profiles`'s own RLS policy
  (no `FORCE ROW LEVEL SECURITY` is used anywhere in this project). The
  internal `profiles` read inside `is_admin()` never re-enters
  `profiles_select_own_or_admin` at all, so the cycle cannot occur
  regardless of row count or plan shape.
- `LANGUAGE PLPGSQL` — never inlined by the planner, so the `SECURITY
  DEFINER` privilege switch always takes effect.

`CREATE OR REPLACE` preserves the function's identity and return type —
every existing policy that calls `is_admin()` (on `profiles`,
`categories`, `items`, `requests`, `request_status_history`,
`comments`) keeps the exact same access rule it already had. No grant
changes needed (the `0003`/`0010` `GRANT EXECUTE ... TO authenticated`
carries over). RLS stays enabled everywhere, no access rule is loosened,
`max_stack_depth` is untouched.

No frontend code changed. Confirmed by grep that `is_admin()` is defined
in exactly one place and every other reference is a policy/function call
site, not a redefinition.

## Verification (needs the user — same constraint as before: no DB
credentials or browser automation exist in this environment)

Apply `0011_fix_is_admin_recursion.sql` in the SQL Editor, then re-run
the same simulated-role test as before, for **both** roles:

```sql
begin;
set local role authenticated;
set local request.jwt.claims := '{"sub": "<member-user_id>", "role": "authenticated"}';

select public.is_admin();  -- expect: false

select id, name, active, created_at
from public.categories where active = true;

select id, name, category_id, serial_number, active, image_path, created_at
from public.items where active = true;

rollback;
```

Repeat with an admin's `user_id` substituted — expect `is_admin()` →
`true`, and (per the unchanged `items_select`/`categories_select` rules)
visibility into inactive rows too, since those policies already grant
admins full access via `public.is_admin()`.

Then, as a real signed-in member in the browser, reload `/member/catalog`
and confirm active equipment renders without error — the actual
end-to-end check this has been blocked on since `0007`.

## Not verified (needs the user)

- The live effect of `0011_fix_is_admin_recursion.sql` — not yet applied
  to the project.
- Everything needing a real authenticated browser session: the rest of
  the catalog/requests/dashboard workflow end-to-end. Still no DB
  credentials or browser automation exist in this environment.
