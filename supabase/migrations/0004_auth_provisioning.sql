-- Estaer — 0004: approved-employee provisioning.
--
-- Two pieces, both trusted and narrowly scoped:
--   1. handle_new_user() — after a user row is actually created, copies
--      their role from approved_employees into profiles. Runs with
--      definer rights so it does not need any grant on profiles; the
--      application itself can never set a role.
--   2. hook_restrict_employee_signup() — registered in the Dashboard as
--      the "Before User Created" Auth Hook. Rejects account creation
--      outright for any email not in approved_employees, so an
--      unapproved address never gets even a shadow auth.users row.
--
-- create_request()/update_request_status() (the reservation and
-- status-transition business logic) are deliberately NOT part of this
-- migration — they land with the Requests feature (a later phase), once
-- there is a form that actually calls them.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assigned_role public.user_role;
begin
  select role into v_assigned_role
  from public.approved_employees
  where email = new.email;

  insert into public.profiles (user_id, email, display_name, role)
  values (new.id, new.email, new.email, coalesce(v_assigned_role, 'member'));

  return new;
end;
$$;

-- Only the Auth service (acting as supabase_auth_admin) ever fires this
-- trigger via an insert on auth.users — no other grant is needed.
grant execute on function public.handle_new_user() to supabase_auth_admin;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create or replace function public.hook_restrict_employee_signup(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_incoming_email text;
begin
  v_incoming_email := event -> 'user' ->> 'email';

  if exists (
    select 1 from public.approved_employees where email = v_incoming_email
  ) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'This email is not registered as an approved employee.'
    )
  );
end;
$$;

-- Only the Auth service may call this — it is never reachable through
-- the Data API, and must not be callable by ordinary users or anon.
grant execute on function public.hook_restrict_employee_signup(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_restrict_employee_signup(jsonb)
  from authenticated, anon, public;
