-- Estaer — 0003: Row Level Security.
--
-- This project has "Automatic RLS" enabled, which turns RLS on for tables
-- as they're created — these ENABLE statements are included anyway for
-- clarity and so this migration is correct even without that project
-- setting.

-- is_admin(): reads the caller's OWN profile row (permitted by the
-- policy below regardless of this function) to check their role. Runs as
-- SECURITY INVOKER — it carries no elevated rights, so it cannot become a
-- privilege-escalation path; it only ever sees what auth.uid() could
-- already see directly.
create or replace function public.is_admin()
returns boolean
language sql
security invoker
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.user_id = auth.uid() and profiles.role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select_own_or_admin
  on public.profiles for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- No insert/update policy: rows are written only by the handle_new_user()
-- trigger (definer rights); 0002_grants.sql already revokes INSERT/UPDATE
-- from `authenticated` so this is enforced twice over.

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
alter table public.categories enable row level security;

create policy categories_select
  on public.categories for select
  to authenticated
  using (active = true or public.is_admin());

create policy categories_admin_insert
  on public.categories for insert
  to authenticated
  with check (public.is_admin());

create policy categories_admin_update
  on public.categories for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- items
-- ---------------------------------------------------------------------
alter table public.items enable row level security;

-- Members see an item only if it is active AND its category is active;
-- admins see everything (REQUIREMENTS.md §13).
create policy items_select
  on public.items for select
  to authenticated
  using (
    public.is_admin()
    or (
      active = true
      and exists (
        select 1
        from public.categories c
        where c.id = items.category_id and c.active = true
      )
    )
  );

create policy items_admin_insert
  on public.items for insert
  to authenticated
  with check (public.is_admin());

create policy items_admin_update
  on public.items for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- requests
-- ---------------------------------------------------------------------
alter table public.requests enable row level security;

create policy requests_select_own_or_admin
  on public.requests for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- No insert/update policy: 0002_grants.sql revokes INSERT/UPDATE from
-- `authenticated` entirely. All writes go through create_request() /
-- update_request_status() (0004_functions.sql), which run with definer
-- rights and so do not depend on this grant either way.

-- ---------------------------------------------------------------------
-- request_status_history
-- ---------------------------------------------------------------------
alter table public.request_status_history enable row level security;

create policy request_status_history_select
  on public.request_status_history for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.requests r
      where r.id = request_status_history.request_id and r.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------
alter table public.comments enable row level security;

create policy comments_select
  on public.comments for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.requests r
      where r.id = comments.request_id and r.user_id = auth.uid()
    )
  );

-- The author must always be the caller themselves (never a client-supplied
-- id), and they may only comment on their own request unless they're an
-- admin — the same visibility rule as reading.
create policy comments_insert
  on public.comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and (
      public.is_admin()
      or exists (
        select 1
        from public.requests r
        where r.id = comments.request_id and r.user_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------
-- approved_employees
-- ---------------------------------------------------------------------
-- RLS enabled, deliberately with NO policies at all: even if a future
-- change accidentally granted a table privilege here, the default-deny
-- (no policy = no rows) would still block every role. The only reader is
-- the before_user_created hook, which bypasses the Data API/RLS entirely.
alter table public.approved_employees enable row level security;
