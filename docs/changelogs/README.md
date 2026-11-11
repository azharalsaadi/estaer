# Changelogs — append-only workflow

During ordinary feature work, **never** edit `../STRUCTURE.md`,
`../DESIGN_SYSTEM_REFERENCE.md`, or `../../AGENT.md` directly. Instead:

1. Add **one new file per task/change** here, named
   `YYYY-MM-DD-short-description.md`.
2. Write what changed and why, in enough detail that it could be folded
   into the core docs later without re-deriving context.
3. Core docs are only updated in a separate, explicitly agreed
   documentation pass that consolidates the pending changelog entries.

## Entries

- [2026-11-06-phase-2-foundation.md](./2026-11-06-phase-2-foundation.md) —
  project scaffold, theme, i18n, Member/Admin portal shells and routes.
- [2026-11-07-phase-3-supabase-auth.md](./2026-11-07-phase-3-supabase-auth.md) —
  Supabase schema/RLS/grants, approved-employee provisioning, real
  email-OTP sign-in, router auth guard. Includes a pending correction to
  STRUCTURE.md's `redirect()` note.
- [2026-11-07-phase-4-catalog.md](./2026-11-07-phase-4-catalog.md) —
  equipment catalog: member browsing, admin create/edit/deactivate
  dialogs for categories and equipment. No new migration. Includes a
  pending STRUCTURE.md note on the dialog remount-via-`key` pattern.
- [2026-11-08-phase-4-fixes-and-phase-5-6-requests.md](./2026-11-08-phase-4-fixes-and-phase-5-6-requests.md) —
  two bug investigations (one real fix in the auth subscription, one
  likely cross-tab-session explanation), equipment images, the full
  borrowing workflow (requests, reservations, approvals/rejection/returns,
  comments, history, cancellation, dashboard stats), and the project's
  first automated tests (vitest). Flags "extensions" as not implemented
  pending a design decision.
- [2026-11-09-auth-guard-staletime-fix.md](./2026-11-09-auth-guard-staletime-fix.md) —
  root cause found: the router's auth guard silently refetched the
  session/role on every navigation (a missing `staleTime` override),
  opening a window for a misroute right after a save. Fixed by sharing
  one query-options object between the guard and `useAuth()`. Also made
  the bare `/` redirect role-aware.
- [2026-11-09-catalog-load-missing-migrations.md](./2026-11-09-catalog-load-missing-migrations.md) —
  confirmed (not guessed) via a live-project schema probe: `0005` and
  `0006` were never applied to the connected database, so `image_path`
  doesn't exist and every items query 400s. No code changed — the fix is
  applying the migrations.
- [2026-11-09-rls-recursion-fix.md](./2026-11-09-rls-recursion-fix.md) —
  traced and fixed `42P17` infinite recursion: `0007` made
  `items_select`/`categories_select` read each other. New migration
  `0008_fix_catalog_rls_recursion.sql` breaks the cycle via three
  `SECURITY DEFINER` helper functions (RLS-exempt as the tables' owner).
  No frontend code changed.
- [2026-11-10-redirect-fix-diagnostics-audit.md](./2026-11-10-redirect-fix-diagnostics-audit.md) —
  role-aware post-login landing (`resolvePostLoginDestination`), real
  console diagnostics for unmapped catalog/request errors, and a full
  spec audit (no other gaps found). Catalog load is still blocked on one
  piece of evidence only the user can get (the live authenticated-role
  error, since anon's grant-level block can't exercise RLS evaluation).
- [2026-11-10-fix-security-definer-inlining.md](./2026-11-10-fix-security-definer-inlining.md) —
  root cause of `54001 stack depth limit exceeded`: 0008's single-
  statement `LANGUAGE SQL SECURITY DEFINER` functions were being inlined
  by the planner, silently defeating the RLS bypass they existed for.
  `0009_fix_security_definer_inlining.sql` converts them (and
  `get_item_availability`) to `LANGUAGE PLPGSQL`, which Postgres never
  inlines.
- [2026-11-10-revoke-public-execute.md](./2026-11-10-revoke-public-execute.md) —
  independent finding (confirmed via anon-key probes): every custom
  function except one relied on the implicit PostgreSQL default
  `PUBLIC` execute grant, callable by `anon`. Fixed in
  `0010_revoke_public_execute.sql`. Catalog recursion diagnosis is
  blocked pending one piece of evidence — a `SET LOCAL ROLE
  authenticated` SQL Editor test — since anon probing structurally
  cannot exercise authenticated-role RLS evaluation.
- [2026-11-10-full-rebuild-and-catalog-rls-redesign.md](./2026-11-10-full-rebuild-and-catalog-rls-redesign.md) —
  full rebuild from scratch (backup → isolated build/verify → swap),
  same Supabase project/accounts/data preserved throughout. Proposed
  `0011_simplify_catalog_visibility.sql` as the catalog-RLS fix; this
  was superseded the same day once the real cause was confirmed — see
  below.
- [2026-11-08-fix-is-admin-recursion.md](./2026-11-08-fix-is-admin-recursion.md) —
  the SQL Editor test under a simulated authenticated member role
  (requested before any further rebuild work) confirmed the real cause:
  `is_admin()` itself self-recurses through `profiles`'s own SELECT
  policy, unrelated to the items/categories cycle. Fixed in
  `0011_fix_is_admin_recursion.sql` (SECURITY DEFINER + LANGUAGE
  PLPGSQL, same pattern as 0008/0009) — reuses the `0011` slot after
  deleting the never-applied, superseded `0011_simplify_catalog_
  visibility.sql` draft. Preserves every existing access rule
  unchanged. Not yet applied to the live project.
- [2026-11-08-equipment-image-fallback-and-stale-upload-fix.md](./2026-11-08-equipment-image-fallback-and-stale-upload-fix.md) —
  root cause of the MON-001 broken image: uploads reused one fixed
  storage path per item, so the browser/cache kept serving a prior
  cached response under that same URL even after a successful
  replacement upload. Fixed by uploading to a fresh unique path every
  time (old object best-effort cleaned up after). Also added an
  `onError` fallback chain (uploaded image → category illustration →
  generic icon) to `EquipmentCard`/`ItemDialog`, which previously had
  no fallback for an uploaded image that loaded 200 but failed to
  render. No RLS/migration change; design assets confirmed already
  correctly handled (`.png`-named files that are actually SVG).
- [2026-11-08-image-content-validation-and-edit-dialog-blank-fields.md](./2026-11-08-image-content-validation-and-edit-dialog-blank-fields.md) —
  downloaded and inspected the exact MON-001 object: it was
  byte-identical to `laptops.svg` — the design-handoff's own
  mislabeled-as-PNG asset had been selected in the file picker instead
  of a real photo. The upload pipeline was never broken; nothing
  validated actual file bytes against the browser-reported (name-
  derived) MIME type. Added `imageSignature.ts` (magic-byte check) used
  before accepting a file, with a new validation message. Separately
  fixed the edit dialog showing blank name/serial/category on a direct
  edit-URL load — the dialog's remount key didn't account for
  `useAllItems()` still loading at first mount.
- [2026-11-08-public-member-landing-and-language-toggle.md](./2026-11-08-public-member-landing-and-language-toggle.md) —
  `/member` is now public (landing page, zeroed stats, no private
  fetch) while every other member route stays protected; `MemberShell`
  shows Sign in/Sign out based on session; sign-out now returns to
  `/member`. Traced the language toggle mechanism end to end (found it
  correctly wired) and fixed the one real gap — no control existed on
  the login/OTP screen.
- [2026-11-08-remove-admin-my-requests-page.md](./2026-11-08-remove-admin-my-requests-page.md) —
  removed the admin "My Requests" page/route/nav entry (both sidebar and
  mobile drawer, which share one nav config) and the now-dead
  `"admin-own"` `RequestsTable` variant. Admin "All Requests", member
  "My Requests", shared components, and all request records unchanged.
- [2026-11-08-admin-nav-active-state-fix.md](./2026-11-08-admin-nav-active-state-fix.md) —
  Overview stayed highlighted on every admin page because TanStack
  Router's default `Link` match is a path-segment prefix match and
  "/admin" prefixes everything. Added `isNavItemActive()` with
  `exact`/`alsoActiveOn` per nav item; `AdminShell` now computes active
  state explicitly instead of relying on `activeProps`. Fixes both the
  desktop sidebar and mobile drawer (one shared component). Same latent
  bug flagged but left untouched in the member portal (out of scope).
- [2026-11-09-merge-catalog-categories-nav-link.md](./2026-11-09-merge-catalog-categories-nav-link.md) —
  merged the Equipment and Categories sidebar/drawer links into one
  "Catalog" link (`/admin/catalog`, highlighted on both pages via
  `alsoActiveOn`). The in-page Equipment/Categories tabs (`CatalogTabs.tsx`)
  and both routes are untouched — the new sidebar label uses its own key
  so it can never rename the in-page tabs.
- [2026-11-09-visibility-switch.md](./2026-11-09-visibility-switch.md) —
  replaced the Visibility `Select` in both the category and equipment
  dialogs with the existing (previously unused) shadcn `Switch`, bound to
  the same `active` field. Teal/gray/white and RTL support came for free
  from the project's existing design tokens and the component's own
  `rtl:` classes — no custom styling needed. Status badges in the
  tables, Save/Cancel mechanics, and the Catalog nav/tabs are untouched.
- [2026-11-09-add-success-toast.md](./2026-11-09-add-success-toast.md) —
  Add Equipment/Add Category now show a specific "added successfully"
  toast (new `equipmentAdded`/`categoryAdded` keys) instead of the
  generic "saved" message; edit mode keeps the original wording. Reused
  the existing `sonner` toast/`Toaster` setup — no new notification
  plumbing. List refresh and failure handling (dialog stays open,
  inputs kept, clear inline error) were already correct and untouched.
- [2026-11-09-add-confirmation-dialog.md](./2026-11-09-add-confirmation-dialog.md) —
  Add Equipment/Add Category now open a confirmation step after
  validation and before saving/uploading. Reused and generalized the
  existing requests-feature `ConfirmActionDialog` (moved to
  `components/shared/`, `body` now optional, label key unified to
  `common.confirm`) rather than building a new one. Edit mode, Cancel's
  "leave inputs untouched," and error handling are unchanged.
- [2026-11-09-date-range-overlap-enforcement.md](./2026-11-09-date-range-overlap-enforcement.md) —
  found the real bug: the exclusive-reservation rule was a unique index
  on `item_id` alone (no date awareness at all), so a booked item stayed
  blocked for every future date until returned. Replaced it with a GiST
  date-range exclusion constraint (`0012_date_range_overlap.sql`,
  inclusive on both ends, atomic under concurrent inserts/approvals).
  Catalog button no longer disables when booked — shows "Currently
  booked" + an enabled "Book for another date," same form, real check
  on submit. Not yet applied to the live project.
- [2026-11-09-booking-calendar-with-highlighted-dates.md](./2026-11-09-booking-calendar-with-highlighted-dates.md) —
  the request form's two plain date inputs became real calendars
  (added shadcn's `calendar` component, fixing the same `cn`-package
  CLI quirk as always) highlighting the item's booked days in the
  app's existing soft-teal `muted` token, with a "Booked" legend. Start
  Date disables booked days; End Date disables anything that would make
  the whole range cross a booking (a broader, different rule — see the
  entry). New read-only RPC `get_item_booked_ranges`
  (`0013_item_booked_ranges.sql`, not yet applied) feeds the
  highlighting; the actual overlap rule is still `0012`'s constraint.
- [2026-11-09-fix-dev-server-stale-deps-cache.md](./2026-11-09-fix-dev-server-stale-deps-cache.md) —
  root cause of the `/admin/borrow` "Failed to fetch dynamically
  imported module" crash: the running dev server's Vite deps cache
  predated `react-day-picker`/`date-fns`, so neither was ever bundled.
  Fixed by clearing `node_modules/.vite` and restarting on port 5180.
  Also: the request dialog no longer silently treats a failed
  booked-ranges fetch (e.g. migration 0013 not yet applied) as "nothing
  is booked" — it now shows a clear error and disables Submit instead.
- [2026-11-09-reassert-overlap-constraint.md](./2026-11-09-reassert-overlap-constraint.md) —
  diagnosed the reported calendar-vs-server mismatch: `get_item_booked_
  ranges`, `get_item_availability`, and `create_request`'s constraint
  were already self-consistent (no return-due-date padding anywhere);
  the likely real cause is that `0012`'s exclusion constraint never
  actually took effect on the live database, leaving the old
  date-blind unique index from `0001` still enforcing "one booking per
  item, ever." New idempotent migration
  `0014_reassert_date_range_overlap.sql` re-asserts the fix regardless
  of current state; includes a `pg_constraint`/`pg_indexes` query to
  confirm which one is actually live.
- [2026-11-09-fix-0014-missing-create-request.md](./2026-11-09-fix-0014-missing-create-request.md) —
  user retrieved the deployed `create_request` definition directly:
  it only ever caught `unique_violation`, never `exclusion_violation`,
  confirming `0012` never reached this database and the old date-blind
  unique index is still what's live. Also caught a real gap in `0014`
  itself, before it was ever applied: it swapped the constraint but
  never re-created `create_request` to catch the new constraint's
  error code — fixed by making `0014` fully self-contained.
- [2026-11-09-request-submission-confirmation.md](./2026-11-09-request-submission-confirmation.md) —
  Submit request now opens a confirmation step (reusing
  `ConfirmActionDialog`, same as Add Equipment/Category and Cancel/
  Return request) showing the equipment name, start date, last day of
  use, and return due date before creating the request. Widened
  `ConfirmActionDialog`'s `body` to `ReactNode` to support this
  structured review — backward compatible with every existing caller.
  Availability checks and the approval workflow are untouched.
- [2026-11-10-member-request-dialog-redesign.md](./2026-11-10-member-request-dialog-redesign.md) —
  redesigned the member borrowing dialog to Estaer's visual identity
  (760px max-width, balanced two-column calendars centered as a group,
  24/32 bold title, 16/24 equipment name, 14/20 labels/helper text,
  mobile stacking + scrollable body), scoped to member only. Extracted
  all shared logic into `useRequestEquipmentForm` first so the admin
  dialog (`RequestEquipmentDialog`, left pixel-identical) and the new
  `MemberRequestEquipmentDialog` differ only in layout, never behavior.
- [2026-11-10-admin-borrow-dialog-redesign.md](./2026-11-10-admin-borrow-dialog-redesign.md) —
  admin needed the exact same redesign, and the two dialogs' behavior
  was already identical, so consolidated into one component instead of
  forking again: `MemberRequestEquipmentDialog` renamed to
  `RequestEquipmentFormDialog` (shared by both portals), the old
  admin-only-layout `RequestEquipmentDialog` deleted,
  `RequestEquipmentAction`'s now-unneeded `variant` prop removed.
  `admin-borrow.page.tsx` needed zero changes to pick it up.
- [2026-11-10-borrow-dialog-popover-redesign.md](./2026-11-10-borrow-dialog-popover-redesign.md) —
  fixed a real bug (adjacent booked days merging into one block —
  `CalendarDayButton` only rounds conditionally for a range-selection
  mode this app never uses; added an unconditional `m-0.5 rounded-full`
  in `BookingCalendar`) and reworked both date fields into
  closed-by-default popovers (new `DateFieldPopover`, shadcn `popover`
  added), only one open at a time, closing on selection — superseding
  the prior "always open inline" instruction per this session's revised
  spec. Dialog narrowed to 560px; title now 20/28 semibold. Booking
  rules/confirmation flow untouched.
