-- Estaer — approved-employee allow-list template.
--
-- NOT a migration — do not run this file as-is. Copy the statement below
-- into the SQL Editor, replace the example rows with your own real
-- employee emails and roles, and run it there. Re-run with more rows any
-- time you need to approve additional employees; there is no in-app
-- screen for this by design (REQUIREMENTS.md §11).
--
-- Add at least your OWN email with role 'admin' first, so you have an
-- account to sign in and test with once OTP is configured.

insert into public.approved_employees (email, role) values
  ('you@yourcompany.com', 'admin'),
  ('another.employee@yourcompany.com', 'member')
on conflict (email) do update set role = excluded.role;
