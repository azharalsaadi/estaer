-- Estaer — 0013: expose an item's booked date ranges, for the booking
-- calendar's "Booked" highlighting (REQUIREMENTS: highlight/disable
-- booked days in the Start Date picker, highlight them in the End Date
-- picker, validate the whole selected range client-side before submit).
--
-- The actual overlap RULE is already enforced at the database level by
-- requests_no_overlapping_reservation (0012_date_range_overlap.sql) —
-- this function is read-only UI support, not new enforcement. It
-- discloses only the two dates of each pending/approved booking for one
-- item, nothing else (no requester identity, no reason) — the same
-- privacy-minimal pattern as get_item_availability (0006).

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
