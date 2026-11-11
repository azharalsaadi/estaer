-- Estaer — 0006: borrowing workflow business logic.
--
-- Everything here is SECURITY DEFINER and narrowly scoped: each function
-- does exactly one state transition, re-validates it against the current
-- row (never trusts the caller's idea of the current state), and writes
-- its own status-history entry. authenticated has no direct INSERT/UPDATE
-- grant on requests (0002_grants.sql) — every write goes through one of
-- these functions.

alter table public.request_status_history add column if not exists note text;

-- Single place to change the business timezone (REQUIREMENTS.md §15).
create or replace function public.business_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Muscat')::date;
$$;

grant execute on function public.business_today() to authenticated;

-- ---------------------------------------------------------------------
-- create_request: the confirmed exclusive-reservation rule, enforced
-- atomically. requests_one_active_reservation_per_item (0001_schema.sql)
-- is the actual atomicity guarantee — this function just turns a
-- concurrent conflict into a clear, recoverable error code instead of a
-- raw constraint-violation message.
-- ---------------------------------------------------------------------
create or replace function public.create_request(
  p_item_id uuid,
  p_start_date date,
  p_end_date date,
  p_reason text
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_item public.items;
  v_category_active boolean;
  v_trimmed_reason text := btrim(coalesce(p_reason, ''));
  v_new_request public.requests;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  if p_end_date < p_start_date then
    raise exception using errcode = '22023', message = 'INVALID_DATE_RANGE';
  end if;

  if p_start_date < public.business_today() then
    raise exception using errcode = '22023', message = 'START_DATE_IN_PAST';
  end if;

  if v_trimmed_reason = '' or char_length(v_trimmed_reason) > 1000 then
    raise exception using errcode = '22023', message = 'INVALID_REASON';
  end if;

  select * into v_item from public.items where id = p_item_id;
  if v_item.id is null or v_item.active is not true then
    raise exception using errcode = 'P0001', message = 'ITEM_NOT_AVAILABLE';
  end if;

  select active into v_category_active
  from public.categories
  where id = v_item.category_id;

  if v_category_active is not true then
    raise exception using errcode = 'P0001', message = 'ITEM_NOT_AVAILABLE';
  end if;

  begin
    insert into public.requests (user_id, item_id, start_date, end_date, reason, status)
    values (v_user_id, p_item_id, p_start_date, p_end_date, v_trimmed_reason, 'pending')
    returning * into v_new_request;
  exception
    when unique_violation then
      raise exception using errcode = 'P0001', message = 'ITEM_ALREADY_RESERVED';
  end;

  insert into public.request_status_history (request_id, from_status, to_status, actor_id)
  values (v_new_request.id, null, 'pending', v_user_id);

  return v_new_request;
end;
$$;

grant execute on function public.create_request(uuid, date, date, text) to authenticated;

-- ---------------------------------------------------------------------
-- update_request_status: admin-only. approve/reject a pending request,
-- or record a return on an approved one. Rejection requires a reason.
-- ---------------------------------------------------------------------
create or replace function public.update_request_status(
  p_request_id uuid,
  p_new_status public.request_status,
  p_rejection_reason text default null
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_old_status public.request_status;
  v_allowed boolean := false;
  v_result public.requests;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  if p_new_status not in ('approved', 'rejected', 'returned') then
    raise exception using errcode = '22023', message = 'INVALID_TRANSITION';
  end if;

  select status into v_old_status from public.requests where id = p_request_id for update;
  if v_old_status is null then
    raise exception using errcode = 'P0002', message = 'REQUEST_NOT_FOUND';
  end if;

  if v_old_status = 'pending' and p_new_status in ('approved', 'rejected') then
    v_allowed := true;
  elsif v_old_status = 'approved' and p_new_status = 'returned' then
    v_allowed := true;
  end if;

  if not v_allowed then
    raise exception using errcode = 'P0001', message = 'INVALID_TRANSITION';
  end if;

  if p_new_status = 'rejected' and btrim(coalesce(p_rejection_reason, '')) = '' then
    raise exception using errcode = '22023', message = 'REJECTION_REASON_REQUIRED';
  end if;

  update public.requests
  set status = p_new_status, updated_at = now()
  where id = p_request_id
  returning * into v_result;

  insert into public.request_status_history (request_id, from_status, to_status, actor_id, note)
  values (
    p_request_id,
    v_old_status,
    p_new_status,
    v_actor,
    case when p_new_status = 'rejected' then btrim(p_rejection_reason) else null end
  );

  return v_result;
end;
$$;

grant execute on function public.update_request_status(uuid, public.request_status, text)
  to authenticated;

-- ---------------------------------------------------------------------
-- cancel_request: a MEMBER withdrawing their OWN still-pending request.
-- Reuses the 'rejected' status rather than adding a new one — the
-- confirmed status set stays exactly {pending, approved, rejected,
-- returned}. A cancellation is distinguished from an admin rejection by
-- its actor (the requester themselves) and its note, not by a new status.
-- Not part of the original plan's named transitions — added because the
-- user asked for request cancellation; narrowly scoped to pending-only,
-- own-request-only, so it cannot be used to undo an approval or a return.
-- ---------------------------------------------------------------------
create or replace function public.cancel_request(p_request_id uuid)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_status public.request_status;
  v_result public.requests;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  select user_id, status into v_owner, v_status
  from public.requests
  where id = p_request_id
  for update;

  if v_owner is null then
    raise exception using errcode = 'P0002', message = 'REQUEST_NOT_FOUND';
  end if;

  if v_owner <> v_actor then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  if v_status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'INVALID_TRANSITION';
  end if;

  update public.requests
  set status = 'rejected', updated_at = now()
  where id = p_request_id
  returning * into v_result;

  insert into public.request_status_history (request_id, from_status, to_status, actor_id, note)
  values (p_request_id, 'pending', 'rejected', v_actor, 'Cancelled by requester');

  return v_result;
end;
$$;

grant execute on function public.cancel_request(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- get_item_availability: lets a MEMBER know whether an item currently has
-- a blocking (pending/approved) request, WITHOUT exposing whose request
-- it is or any other detail — a member's own RLS visibility on `requests`
-- only covers their own rows, so this one narrow boolean is the only
-- thing this function discloses beyond that.
-- ---------------------------------------------------------------------
create or replace function public.get_item_availability(p_item_ids uuid[])
returns table (item_id uuid, is_available boolean)
language sql
security definer
stable
set search_path = ''
as $$
  select i.id, not exists (
    select 1
    from public.requests r
    where r.item_id = i.id and r.status in ('pending', 'approved')
  )
  from public.items i
  where i.id = any(p_item_ids);
$$;

grant execute on function public.get_item_availability(uuid[]) to authenticated;
