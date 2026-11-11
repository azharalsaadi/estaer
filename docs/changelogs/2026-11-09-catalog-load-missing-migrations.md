# 2026-11-09 — Catalog load failure: root cause confirmed, no code changed

## Root cause (directly confirmed, not inferred)

Migrations `0005_item_images.sql` and `0006_requests_functions.sql` were
never applied to the connected Supabase project — only `0001`–`0004` are
live. Confirmed with a column-existence probe against the live project
(anon key, read-only, no credentials needed): requesting a column that
genuinely doesn't exist and requesting `image_path` return the **identical**
error, distinct from the generic permission-denied a real-but-ungranted
column gives:

```
# A real column (id), anon has no grant — generic 42501:
{"code":"42501","message":"permission denied for table items", ...}

# image_path — NOT a permission error, a schema error:
{"code":"42703","message":"column items.image_path does not exist"}

# A column I made up that definitely doesn't exist — IDENTICAL shape:
{"code":"42703","message":"column items.definitely_fake_column_xyz does not exist"}
```

Same probe against `create_request` (from `0006`) and
`request_status_history.note` (also `0006`):

```
{"code":"PGRST202", "message":"Could not find the function public.create_request(...) in the schema cache"}
{"code":"42703","message":"column request_status_history.note does not exist"}
```

This is **not a permissions/RLS bug** — nothing in `0002_grants.sql` or
`0003_rls.sql` needed changing, and nothing was. `items.api.ts`'s
`ITEM_COLUMNS` constant (used by every items read AND by
`createItemApi`/`updateItemApi`'s `.select(...)` after insert/update)
includes `image_path`, which is correct against the schema `0005` defines
— the deployed database is simply behind the migrations already sitting
in the repo.

## Why this explains everything reported

- `/member/catalog` (`listActiveItemsApi`) and `/admin` browsing the
  member portal both call the exact same function — both fail identically
  on the missing column, which is why "regular member" and "admin
  browsing as a member" showed the same error.
- **The equipment the admin tried to add was very likely never actually
  saved.** `createItemApi` is `.insert(payload).select(ITEM_COLUMNS).single()`
  — the `.select(...)` after insert hits the same missing-column error,
  which fails the whole request (PostgREST builds one query covering the
  insert and its `RETURNING` column list). I cannot directly confirm this
  by querying their `items` table (no credentials, and anon has no SELECT
  grant there — correctly, by design), but it follows directly from the
  error class: the same `42703` that breaks every read would have broken
  that write's `RETURNING` clause too.

## What I did NOT change

No code. The frontend is correct against the schema the migrations
already define; the fix is applying those migrations, not altering the
access layer, RLS, or grants.

## What to do (exact steps)

1. In the Supabase SQL Editor, run, in order:
   `supabase/migrations/0005_item_images.sql`, then
   `supabase/migrations/0006_requests_functions.sql`, then
   `supabase/migrations/0007_item_history_visibility.sql`. All three are
   safe to run now even if something partially landed before — `0005`'s
   `ADD COLUMN IF NOT EXISTS`/`ON CONFLICT DO NOTHING` are idempotent,
   `0006`'s functions are `CREATE OR REPLACE`, and `0007` does
   `DROP POLICY IF EXISTS` before recreating.
2. Verify directly in the SQL Editor:
   ```sql
   -- expect image_path in this list
   select column_name from information_schema.columns
   where table_schema = 'public' and table_name = 'items' order by 1;

   -- expect exactly 1 row, public = true
   select id, public from storage.buckets where id = 'equipment-images';

   -- expect 5 rows
   select proname from pg_proc
   where pronamespace = 'public'::regnamespace
     and proname in ('create_request','update_request_status','cancel_request','get_item_availability','business_today');
   ```
3. Re-check whether the equipment you tried to add earlier actually
   exists (`select * from public.items order by created_at desc limit 5;`
   in the SQL Editor) — if it isn't there, add it again from
   `/admin/catalog` after step 1.

## Verification actually run

- Live-project schema probe (above) — this session's actual evidence for
  the root cause, not a guess.
- `npm run typecheck` / `lint` / `build` / `test` — all still pass
  (unchanged, since no code was touched).

**Not verified**: the catalog actually loading, an uploaded image
rendering on a member's card, or the no-image fallback — all need the
migrations applied first, then a real browser (none available in this
environment). Please re-test after step 1 above and tell me what you see.
