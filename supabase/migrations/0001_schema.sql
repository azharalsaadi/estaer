-- Estaer — 0001: enums, core tables, constraints.
-- Run in the Supabase SQL Editor (or via the CLI), in file-name order.

create type public.user_role as enum ('member', 'admin');
create type public.request_status as enum ('pending', 'approved', 'rejected', 'returned');

-- Pre-approved employee allow-list, maintained by setup-time SQL only.
-- Consulted by the before_user_created Auth Hook (0004_functions.sql).
-- Never exposed to the Data API — see 0002_grants.sql.
create table public.approved_employees (
  email text primary key,
  role public.user_role not null default 'member',
  created_at timestamptz not null default now()
);

comment on table public.approved_employees is
  'Allow-list consulted by the before_user_created Auth Hook. Not reachable via the Data API — see 0002_grants.sql.';

-- One row per authenticated user. Provisioned automatically by the
-- handle_new_user() trigger in 0004_functions.sql — the application
-- itself never inserts or updates a role here.
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role public.user_role not null default 'member',
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 80),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  category_id uuid not null references public.categories (id),
  serial_number text not null unique check (char_length(serial_number) between 1 and 60),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  item_id uuid not null references public.items (id),
  start_date date not null,
  end_date date not null,
  reason text not null check (char_length(reason) between 1 and 1000),
  status public.request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint requests_end_on_or_after_start check (end_date >= start_date)
);

-- Confirmed reservation rule, enforced atomically at the database level:
-- at most one pending OR approved request may exist per item at a time,
-- regardless of requested dates. A concurrent second submission fails
-- this constraint outright instead of racing past an application-level
-- check. create_request() in 0004_functions.sql turns the resulting
-- unique-violation into a clear, recoverable application error.
create unique index requests_one_active_reservation_per_item
  on public.requests (item_id)
  where status in ('pending', 'approved');

create index requests_user_id_idx on public.requests (user_id);
create index requests_item_id_idx on public.requests (item_id);

create table public.request_status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  from_status public.request_status,
  to_status public.request_status not null,
  actor_id uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index request_status_history_request_id_idx
  on public.request_status_history (request_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  author_id uuid not null references auth.users (id),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index comments_request_id_idx on public.comments (request_id);
