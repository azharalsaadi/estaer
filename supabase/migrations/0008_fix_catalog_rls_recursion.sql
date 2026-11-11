-- Estaer — 0008: fix infinite recursion (42P17) introduced by 0007.
--
-- Trace: 0007 added a clause to `items_select` that reads `categories`
-- (to check the item's category is active), AND a clause to
-- `categories_select` that reads `items` (to check historical request
-- ownership). Both tables have RLS enabled, so evaluating either policy
-- requires re-entering the other policy, which requires re-entering the
-- first again. Postgres detects this as a structural cycle at
-- query-rewrite time — regardless of which `OR` branch would actually be
-- true for a given row, since the planner cannot know that without
-- already having resolved the cycle — and raises 42P17 "infinite
-- recursion detected in policy for relation categories".
--
-- Fix: move every CROSS-TABLE read inside a narrowly-scoped
-- SECURITY DEFINER function. Such a function executes as its owner — the
-- same role that owns these tables, since both were created in the same
-- migration session — and Postgres exempts a table's OWNER from that
-- table's own RLS policies unless FORCE ROW LEVEL SECURITY was used
-- (it never is, anywhere in this project). So a read inside one of these
-- functions never re-enters RLS at all: the cycle is broken structurally,
-- not by hoping the planner short-circuits it.
--
-- Each function discloses the absolute minimum: a single boolean about a
-- SPECIFIC id the caller already has, never a row's other columns, never
-- who else holds a request on it. `authenticated` only, fixed
-- `search_path`, no writes — same review bar as the 0006 functions.

create or replace function public.is_category_active(p_category_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select active from public.categories where id = p_category_id;
$$;

grant execute on function public.is_category_active(uuid) to authenticated;

create or replace function public.has_own_request_for_item(p_item_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.requests
    where item_id = p_item_id and user_id = auth.uid()
  );
$$;

grant execute on function public.has_own_request_for_item(uuid) to authenticated;

create or replace function public.has_own_request_for_category(p_category_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.items i
    join public.requests r on r.item_id = i.id
    where i.category_id = p_category_id and r.user_id = auth.uid()
  );
$$;

grant execute on function public.has_own_request_for_category(uuid) to authenticated;

-- Recreate both policies against the functions above instead of a direct
-- cross-table EXISTS subquery. Same visibility rules as 0007 intended —
-- active-only browsing, historical access via one's own requests, full
-- access for admins — just no longer wired as a live cycle.

drop policy if exists items_select on public.items;

create policy items_select
  on public.items for select
  to authenticated
  using (
    public.is_admin()
    or (active = true and public.is_category_active(category_id))
    or public.has_own_request_for_item(id)
  );

drop policy if exists categories_select on public.categories;

create policy categories_select
  on public.categories for select
  to authenticated
  using (
    active = true
    or public.is_admin()
    or public.has_own_request_for_category(id)
  );
