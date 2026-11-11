-- Estaer — 0002: least-privilege Data API grants.
--
-- This project has "Automatically expose new tables" disabled, so a table
-- is unreachable through the Data API (PostgREST/GraphQL) until it is
-- explicitly granted here — that is the entire mechanism; there is no
-- separate dashboard toggle required on top of these grants.
--
-- `anon` (signed-out visitors) is granted nothing on any table, anywhere.
-- Only auth screens are public (REQUIREMENTS.md §11); there is no
-- anonymous browsing of the catalog or anything else.

revoke all on public.approved_employees from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
revoke all on public.categories from anon, authenticated;
revoke all on public.items from anon, authenticated;
revoke all on public.requests from anon, authenticated;
revoke all on public.request_status_history from anon, authenticated;
revoke all on public.comments from anon, authenticated;

-- profiles: read own row only (or admin, via RLS in 0003). No INSERT/UPDATE
-- grant — rows are provisioned only by the handle_new_user() trigger,
-- which runs with definer rights and does not need this grant.
grant select on public.profiles to authenticated;

-- categories / items: members read active rows, admins manage via direct
-- writes checked by RLS (0003) — no SECURITY DEFINER function needed for
-- plain catalog CRUD, which has no concurrency/transition rules to enforce.
grant select, insert, update on public.categories to authenticated;
grant select, insert, update on public.items to authenticated;

-- requests / request_status_history: read-only for `authenticated`. Every
-- write (create, approve, reject, return) goes through a SECURITY DEFINER
-- function in 0004_functions.sql — never a direct table write from the
-- browser, so no INSERT/UPDATE grant exists here.
grant select on public.requests to authenticated;
grant select on public.request_status_history to authenticated;

-- comments: a plain, non-racy, RLS-checked insert is sufficient — no
-- function needed.
grant select, insert on public.comments to authenticated;

-- approved_employees: intentionally NO grants to anyone. It is read only
-- by the before_user_created Auth Hook, which runs as supabase_auth_admin
-- outside the Data API entirely (see 0004_functions.sql).
