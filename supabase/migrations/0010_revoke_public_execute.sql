-- Estaer — 0010: close a least-privilege gap found while diagnosing the
-- catalog issue (unrelated to that bug — this is an independent,
-- confirmed finding, not a guess at the catalog cause).
--
-- PostgreSQL grants EXECUTE on a new function to PUBLIC by default,
-- unless explicitly revoked. Every function in this project except
-- hook_restrict_employee_signup (0004) only ever added
-- `grant execute ... to authenticated` — the implicit PUBLIC grant was
-- never revoked underneath that. Confirmed directly against the live
-- project with the anon key: `is_category_active`, `has_own_request_for_item`,
-- `business_today`, and `get_item_availability` all executed successfully
-- as `anon` (200, with real computed results); `create_request` and
-- `update_request_status` were also callable by anon, though their own
-- internal `auth.uid() is null` check correctly rejected them
-- (`28000 AUTH_REQUIRED`) before any write — so no privilege escalation
-- occurred, but the grant itself was broader than intended.
--
-- This does not touch RLS, does not change any policy, and does not
-- change what `authenticated` can do — it only removes anon/public's
-- ability to invoke these functions at all, matching
-- "signed-out visitors may access only authentication-related screens."

revoke execute on function public.is_admin() from public;
revoke execute on function public.is_category_active(uuid) from public;
revoke execute on function public.has_own_request_for_item(uuid) from public;
revoke execute on function public.has_own_request_for_category(uuid) from public;
revoke execute on function public.get_item_availability(uuid[]) from public;
revoke execute on function public.business_today() from public;
revoke execute on function public.create_request(uuid, date, date, text) from public;
revoke execute on function public.update_request_status(uuid, public.request_status, text)
  from public;
revoke execute on function public.cancel_request(uuid) from public;

-- `revoke ... from public` already covers `anon`/`authenticated` (both
-- inherit from PUBLIC), so re-grant explicitly to authenticated only —
-- identical to each function's original intent.
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_category_active(uuid) to authenticated;
grant execute on function public.has_own_request_for_item(uuid) to authenticated;
grant execute on function public.has_own_request_for_category(uuid) to authenticated;
grant execute on function public.get_item_availability(uuid[]) to authenticated;
grant execute on function public.business_today() to authenticated;
grant execute on function public.create_request(uuid, date, date, text) to authenticated;
grant execute on function public.update_request_status(uuid, public.request_status, text)
  to authenticated;
grant execute on function public.cancel_request(uuid) to authenticated;
