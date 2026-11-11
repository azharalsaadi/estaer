-- Estaer — 0014: re-assert the date-range exclusion constraint,
-- idempotently, and keep every booking-blocking function consistent
-- with it — including create_request itself.
--
-- CONFIRMED (not guessed): the user retrieved create_request's actual
-- deployed definition via `pg_get_functiondef`. Its INSERT's exception
-- block only catches `unique_violation` — it never mentions
-- `exclusion_violation` at all. That is the EXACT shape of the original
-- 0006_requests_functions.sql version, not the 0012_date_range_overlap.sql
-- version (which added `or exclusion_violation` specifically because a
-- GiST exclusion constraint raises a different SQLSTATE than a plain
-- unique index). Since the live function only catches unique_violation,
-- and the live error for a non-overlapping Samsung Monitor range was
-- still a clean P0001 ITEM_ALREADY_RESERVED (not a raw, uncaught
-- Postgres exception), the constraint that actually fired HAD to be a
-- genuine unique_violation (23505) — which an exclusion constraint
-- never raises. That is airtight confirmation that
-- requests_one_active_reservation_per_item (0001_schema.sql — a plain
-- unique index on item_id ALONE, "at most one pending/approved request
-- per item, EVER, regardless of dates") is still what's live, and that
-- 0012_date_range_overlap.sql never actually reached this database.
--
-- To list the live indexes/constraints on public.requests yourself,
-- read-only, at any time:
--
--   select conname, contype, pg_get_constraintdef(oid) as definition
--   from pg_constraint where conrelid = 'public.requests'::regclass;
--
--   select indexname, indexdef from pg_indexes
--   where tablename = 'requests' and schemaname = 'public';
--
-- Fix: replace the old index with a GiST EXCLUDE constraint over
-- (item_id, daterange(start_date, end_date, '[]')), scoped to the same
-- pending/approved statuses — inclusive on both ends, so "Nov 19-20"
-- blocks exactly those two days and nothing else (no padding for the
-- return due date, a separate display-only concept used only by the
-- on-loan/overdue dashboard badges). AND re-create create_request so
-- its exception handler actually catches the exclusion violation this
-- constraint now raises (23P01) alongside the old unique_violation
-- (23505) — this is the piece a prior pass at this fix (also written
-- into this same file, before it was ever applied) was missing: it
-- swapped the constraint but never re-asserted create_request itself,
-- which would have left a genuine future conflict raising an UNCAUGHT
-- exclusion_violation instead of a clean error. This version is fully
-- self-contained: applying it is sufficient regardless of whatever
-- subset of 0012/0013 did or didn't reach this database before.
--
-- This is enforced by Postgres itself, atomically, on INSERT —
-- including under concurrent inserts/approvals: two overlapping-range
-- requests for the same item can never both be in {pending, approved}
-- at once, and approving a request never changes its date range, so
-- approving one can never newly conflict with another.
--
-- btree_gist is required to mix the equality column (item_id) with the
-- range-overlap column inside one GiST exclusion constraint.

create extension if not exists btree_gist;

drop index if exists public.requests_one_active_reservation_per_item;
alter table public.requests drop constraint if exists requests_no_overlapping_reservation;

alter table public.requests
  add constraint requests_no_overlapping_reservation
  exclude using gist (
    item_id with =,
    daterange(start_date, end_date, '[]') with &&
  )
  where (status in ('pending', 'approved'));

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
    when unique_violation or exclusion_violation then
      raise exception using errcode = 'P0001', message = 'ITEM_ALREADY_RESERVED';
  end;

  insert into public.request_status_history (request_id, from_status, to_status, actor_id)
  values (v_new_request.id, null, 'pending', v_user_id);

  return v_new_request;
end;
$$;

grant execute on function public.create_request(uuid, date, date, text) to authenticated;

-- Unchanged from 0013 — reasserted here so this one migration is fully
-- self-contained. No return-due-date padding: a booking ending Nov 20
-- blocks exactly Nov 19-20; Nov 21 is free.
create or replace function public.get_item_booked_ranges(p_item_id uuid)
returns table (start_date date, end_date date)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  return query
    select r.start_date, r.end_date
    from public.requests r
    where r.item_id = p_item_id
      and r.status in ('pending', 'approved');
end;
$$;

revoke execute on function public.get_item_booked_ranges(uuid) from public;
grant execute on function public.get_item_booked_ranges(uuid) to authenticated;

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
      where r.item_id = i.id
        and r.status in ('pending', 'approved')
        and public.business_today() between r.start_date and r.end_date
    )
    from public.items i
    where i.id = any(p_item_ids);
end;
$$;
