# 2026-11-10 — Independent finding: closed a PUBLIC-execute gap on every custom function

## What this is NOT

Not a guess at the catalog recursion/stack-depth cause. This is a
separate, directly confirmed finding from this session's probing, fixed
independently while the main catalog issue remains open (see below).

## Confirmed via live anon-key probes

```
POST .../rpc/is_category_active        → 200 false   (should be blocked for anon)
POST .../rpc/has_own_request_for_item   → 200 false   (should be blocked for anon)
POST .../rpc/business_today             → 200 "2026-11-07"  (should be blocked for anon)
POST .../rpc/get_item_availability      → 200 []      (should be blocked for anon)
POST .../rpc/create_request             → 403 AUTH_REQUIRED (internal check saved it, but shouldn't have been reachable at all)
POST .../rpc/update_request_status      → 403 AUTH_REQUIRED (same)
```

Root cause: PostgreSQL grants `EXECUTE` on a new function to `PUBLIC` by
default unless explicitly revoked. Every function in this project except
`hook_restrict_employee_signup` (0004, which does revoke it) only ever
added `GRANT EXECUTE ... TO authenticated` on top of that default — never
removing the broader PUBLIC grant underneath. The write-RPCs' own
`auth.uid() is null` checks correctly rejected anon before any write, so
**no privilege escalation occurred** — but the grant itself was wider
than intended, violating "signed-out visitors may access only
authentication-related screens."

## Fix: `supabase/migrations/0010_revoke_public_execute.sql`

`REVOKE EXECUTE ... FROM PUBLIC` then re-`GRANT ... TO authenticated` on
all 9 affected functions. Does not touch RLS, does not change any policy,
does not change anything `authenticated` could already do.

## Verification actually run

Anon probes above (before the fix). `npm run typecheck`/`lint`/`build`/
`test` — all still pass (31/31), unchanged (pure SQL change).

**After you run 0010**, re-running those same `curl` calls with the anon
key should flip every one of them to `401`/`403 permission denied for
function`, not a success.

---

# The actual catalog issue — I am now blocked and need one piece of evidence

I re-read `0008`/`0009` once more end to end and could not find a further
structural problem. I also tried every probe available to me:

- Anon-key `curl` against `categories`/`items` — still only tells me the
  table/column/function *exist* (42501, meaning the grant-level ACL
  check rejects anon before RLS is ever evaluated). This **cannot**
  exercise the `authenticated` role's RLS policy evaluation, which is
  exactly where the recursion lives.
- No Supabase CLI, service-role key, JWT secret, or database connection
  string exists anywhere in this environment (re-checked this session) —
  I have no way to authenticate as a member or run SQL directly against
  your project.
- No browser-automation tool exists here, so I cannot drive a real
  signed-in session myself.

**The one piece of evidence I need**: run this in the Supabase SQL
Editor (it genuinely exercises RLS as a specific member — unlike a plain
`select` there, which runs as the superuser-ish connection and bypasses
RLS entirely, telling us nothing):

```sql
begin;
set local role authenticated;
-- replace with a real approved member's user_id from public.profiles
set local request.jwt.claims = '{"sub":"<member-user-id>","role":"authenticated"}';

select * from public.categories;
select * from public.items;

rollback;
```

Paste back whatever either statement returns — the exact error (code/
message/hint/detail) if one occurs, or confirmation that rows came back
successfully. That tells me definitively whether the recursion is really
gone now and, if not, exactly which statement still fails — rather than
me proposing a fourth migration on a guess.
