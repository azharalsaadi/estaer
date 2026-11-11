-- Estaer — 0012: make the exclusive-reservation rule date-range aware.
--
-- requests_one_active_reservation_per_item (0001_schema.sql) was a
-- partial UNIQUE index on (item_id) for pending/approved rows. That
-- blocks a SECOND pending/approved request for an item entirely while
-- ANY one exists — regardless of whether their date ranges actually
-- overlap. That contradicts the real business rule: an item booked
-- Nov 9–11 must still be bookable starting Nov 12, since those ranges
-- don't overlap at all. Under the old constraint, that second booking
-- was rejected with ITEM_ALREADY_RESERVED until the first one was
-- marked 'returned' — even though the dates never conflicted.
--
-- Fix: replace it with a GiST EXCLUDE constraint over
-- (item_id, daterange(start_date, end_date, '[]')), scoped to the same
-- pending/approved statuses. The '[]' bound makes BOTH the start and
-- end date inclusive in the range — "Nov 9–11" occupies Nov 9, 10, and
-- 11 — so a request for Nov 11 conflicts, but Nov 12 does not. This
-- also means two requests can never share even a single calendar day
-- on the same item while both pending/approved.
--
-- This is enforced by Postgres itself, atomically, on INSERT — exactly
-- like the unique index it replaces, including under concurrent
-- inserts. That also covers "concurrent approvals" without any extra
-- locking: since no two overlapping-range requests for the same item
-- can ever BOTH be in {pending, approved} at once, and approving a
-- request never changes its date range, approving one can never newly
-- conflict with another — the constraint already prevented that
-- other request from ever being inserted in the first place.
--
-- btree_gist is required to mix the equality column (item_id, a plain
-- uuid) with the range-overlap column inside one GiST exclusion
-- constraint — a standard, widely-used Postgres/Supabase extension.

create extension if not exists btree_gist;

drop index if exists public.requests_one_active_reservation_per_item;

alter table public.requests
  add constraint requests_no_overlapping_reservation
  exclude using gist (
    item_id with =,
    daterange(start_date, end_date, '[]') with &&
  )
  where (status in ('pending', 'approved'));

-- create_request() (0006_requests_functions.sql) only caught
-- unique_violation (23505) from the old unique index. A GiST exclusion
-- constraint violation raises exclusion_violation (23P01) instead — add
-- that case so a genuine date-range conflict still surfaces as the same
-- clear, recoverable ITEM_ALREADY_RESERVED error instead of a raw
-- Postgres exception.
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

-- get_item_availability (0006_requests_functions.sql) answered "does
-- this item have ANY pending/approved request at all" — not date-range
-- aware, so an item stayed marked unavailable indefinitely even for
-- dates long after its current booking ends. Redefined to mean what
-- the UI actually shows: "is this item booked for TODAY specifically."
-- A member/admin can now always open the request form and pick a later
-- date — the real conflict check (above) runs when they submit.
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
