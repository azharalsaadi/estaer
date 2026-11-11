-- Estaer — 0011: fix 54001 "stack depth limit exceeded" inside is_admin()
-- itself, confirmed directly in the SQL Editor under the authenticated
-- member role:
--
--   ERROR: 54001: stack depth limit exceeded
--   CONTEXT: SQL function "is_admin" during startup
--            SQL function "is_admin" statement 1 (repeated many times)
--
-- Trace: is_admin() (0003) is `language sql`, `security invoker`, and
-- its body reads `public.profiles`:
--
--   select exists (
--     select 1 from public.profiles
--     where profiles.user_id = auth.uid() and profiles.role = 'admin'
--   );
--
-- `profiles` has its own SELECT policy (profiles_select_own_or_admin,
-- 0003):
--
--   using (user_id = auth.uid() or public.is_admin())
--
-- So evaluating is_admin() requires scanning profiles, which requires
-- evaluating THIS policy for every row the scan considers, which calls
-- is_admin() again. For the one row where profiles.user_id = auth.uid(),
-- the policy's first OR-branch is true — but that does not stop Postgres
-- from also evaluating the policy against every OTHER row in the table
-- as part of the same scan (there is no row-level short-circuit across
-- an entire relation, only within a single row's boolean expression).
-- Every other employee's row fails that first branch and forces
-- evaluation of the second (is_admin()), which repeats the identical
-- unbounded scan again, once per other row, recursively. This project
-- always has at least one admin and one member — i.e. always more than
-- one profiles row — so the bug has been latent since 0003 and was
-- bound to surface the moment a real multi-employee, authenticated
-- query exercised it. It was never touched by 0008/0009, which only
-- fixed the (separate, also real) items/categories cross-table cycle.
--
-- Fix: the same pattern already proven correct for the 0008/0009 catalog
-- helper functions — SECURITY DEFINER + LANGUAGE PLPGSQL.
--   - SECURITY DEFINER: runs as the function's owner, who also owns
--     `profiles` and is therefore exempt from `profiles`'s own RLS
--     policies (no FORCE ROW LEVEL SECURITY is used anywhere in this
--     project). is_admin()'s internal read of profiles then never
--     re-enters profiles_select_own_or_admin at all, so the cycle
--     cannot occur regardless of row count or plan shape.
--   - LANGUAGE PLPGSQL: never inlined by the planner (there is no
--     PL/pgSQL inlining in Postgres), so the SECURITY DEFINER privilege
--     switch always takes effect — this is exactly what let the
--     equivalent bug in the 0008 functions hide past the planner until
--     0009's fix.
--
-- This changes ONLY is_admin()'s internals, not its signature or
-- return value. Every existing policy that calls it (on profiles,
-- categories, items, requests, request_status_history, comments) keeps
-- the exact same access rules — admins still see and manage everything,
-- everyone else still sees only what their own policy branch already
-- allowed. CREATE OR REPLACE preserves the function's identity, so the
-- existing `GRANT EXECUTE ... TO authenticated` (0003, reaffirmed by
-- 0010's PUBLIC revocation) carries over unchanged — no grant
-- statement is needed here. RLS stays enabled on every table, no
-- access rule is loosened or widened, and max_stack_depth is not
-- touched: the recursion is removed, not worked around.

create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_is_admin boolean;
begin
  select exists (
    select 1
    from public.profiles
    where profiles.user_id = auth.uid() and profiles.role = 'admin'
  ) into v_is_admin;
  return v_is_admin;
end;
$$;
