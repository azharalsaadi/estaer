-- Estaer — 0009: fix 54001 "stack depth limit exceeded" on `items`,
-- introduced (invisibly) by 0008.
--
-- Trace: 0008's three new functions (is_category_active,
-- has_own_request_for_item, has_own_request_for_category) were each a
-- single-statement `LANGUAGE SQL` function. Postgres's planner is free
-- to INLINE a simple single-SELECT SQL-language function directly into
-- the calling query as an optimization. When that happens, the function
-- body is no longer executed as a genuine function call — it becomes
-- part of the SAME query plan, evaluated under the ORIGINAL caller's
-- privileges. That silently DEFEATS `SECURITY DEFINER`'s privilege
-- switch (which only takes effect for an actual function invocation),
-- so the cross-table read re-entered RLS under the member's own
-- privileges exactly as before 0008 — just now hidden behind a function
-- name instead of a direct subquery. That hiding is also why the error
-- *shape* changed: Postgres's static cycle detector (42P17) inspects the
-- query at rewrite time and can prove a direct policy-to-policy cycle
-- immediately; once the cycle was behind a function call, the planner no
-- longer proves it statically, so the SAME recursion only shows up at
-- runtime, once the executor's call depth exhausts the stack (54001).
--
-- Fix: `LANGUAGE PLPGSQL` functions are NEVER inlined by the planner —
-- there is no PL/pgSQL inlining optimization in Postgres, by design. A
-- plpgsql function is always invoked as a genuine function call, so its
-- `SECURITY DEFINER` privilege switch is always honored, and the
-- cross-table read genuinely never re-enters RLS. Logic, grants,
-- arguments, and return types are all identical to 0008/0006 — only the
-- language and an explicit function body changed. `CREATE OR REPLACE`
-- keeps the same function identity, so the existing `GRANT EXECUTE` and
-- the policies calling these by name need no changes.
--
-- RLS stays enabled on every table (nothing here disables it), no grant
-- is widened, and max_stack_depth is not touched — the recursion is
-- removed, not worked around.

create or replace function public.is_category_active(p_category_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_active boolean;
begin
  select active into v_active from public.categories where id = p_category_id;
  return coalesce(v_active, false);
end;
$$;

create or replace function public.has_own_request_for_item(p_item_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.requests
    where item_id = p_item_id and user_id = auth.uid()
  );
end;
$$;

create or replace function public.has_own_request_for_category(p_category_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  return exists (
    select 1
    from public.items i
    join public.requests r on r.item_id = i.id
    where i.category_id = p_category_id and r.user_id = auth.uid()
  );
end;
$$;

-- Same defect class, same fix — get_item_availability (0006) was also a
-- single-statement SECURITY DEFINER SQL function reading items/requests.
-- Not the cause of this crash (it doesn't participate in the
-- items/categories cycle), but inlining it would silently make
-- availability checks see only the CALLER's own requests instead of
-- everyone's, understating how often an item is actually reserved.
create or replace function public.get_item_availability(p_item_ids uuid[])
returns table (item_id uuid, is_available boolean)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  return query
    select i.id, not exists (
      select 1 from public.requests r
      where r.item_id = i.id and r.status in ('pending', 'approved')
    )
    from public.items i
    where i.id = any(p_item_ids);
end;
$$;
