# 2026-11-10 — Redesign the member borrowing dialog, scoped to member only

## Note on the reference

No screenshot actually came through with this request — only the text
spec. Every measurement given was exact enough (760px, 24px/20px/16px,
24/32, 16/24, 14/20) to implement directly from the written spec
without it; flagging this so a visual check against the real design
reference is still worth doing once there's a real browser available.

## Scoping: a separate component, not a shared one with style switches

`RequestEquipmentDialog` was shared verbatim by both `/admin/borrow`
and `/member/catalog` via `RequestEquipmentAction`. Since the task
asks to redesign the member view only and leave admin's untouched,
split this into:

- **`useRequestEquipmentForm(itemId, onOpenChange)`** (new hook) — all
  the actual behavior: the booked-ranges query, the zod schema, the
  confirm-before-submit step, the mutation, error handling. Identical
  for both portals.
- **`RequestEquipmentDialog`** — refactored to consume the new hook
  instead of inlining this logic, but its JSX/classNames are
  byte-for-byte what they were before. Admin's dialog is visually
  unchanged.
- **`MemberRequestEquipmentDialog`** (new) — the redesigned layout
  below, consuming the exact same hook.
- **`RequestEquipmentAction`** gained a `variant?: "admin" | "member"`
  prop (default `"admin"`, so `admin-borrow.page.tsx` needed zero
  changes) that picks which dialog to render.
  `member-catalog.page.tsx` now passes `variant="member"`.

## Layout changes (member dialog only)

- Dialog: `max-w-[760px]`, padding `p-4 sm:p-6` (16px mobile / 24px
  desktop — Tailwind's `p-4`/`p-6` map exactly). `DialogFooter`'s
  existing `-mx-4 -mb-4 ... p-4` already cancels out to realign its
  content to whatever padding `DialogContent` ends up with, so no
  change was needed there for the return-notice/reason/footer edges to
  line up with the calendars above them.
- Calendar grid: `grid-cols-1 sm:grid-cols-2`, gap `gap-4 sm:gap-5`
  (16px mobile between stacked sections / 20px desktop between the two
  columns — Tailwind's `gap-4`/`gap-5`). Start Date is first in DOM
  order, so it's naturally first when stacked on mobile.
- Each calendar is wrapped in `flex justify-center` within its column
  — `BookingCalendar`'s own `w-fit` sizing meant it previously sat at
  one edge of its container rather than centered, which is almost
  certainly the "large empty space on the left" artifact described.
  Both columns use identical markup, so both calendars end up the same
  width with aligned labels and top edges by construction.
- `max-h-[90vh] overflow-y-auto` on `DialogContent` so a short mobile
  viewport scrolls the whole dialog body, keeping Submit/Cancel
  reachable, instead of the dialog overflowing the screen.

## Typography (member dialog only)

Used the project's existing type scale rather than inventing new
sizes — Tailwind's bundled font-size/line-height pairs already match
the spec exactly:
- Title: `text-2xl leading-8 font-bold` (24px/32px) — kept the base
  `font-heading` family, only overrode size/weight/line-height.
- Equipment name: `text-base leading-6 font-semibold` (16px/24px).
- Helper text and field labels: `text-sm leading-5` (14px/20px) —
  bumped up from the admin dialog's `text-xs` in several spots
  (booked legend, return-due notice, field errors), and overrode
  `Label`'s own default `leading-none` to `leading-5` to get real
  20px line-height.
- Explicit `leading-*` utilities were added alongside every `text-*`
  size override (not relied on implicitly) so `tailwind-merge`
  unambiguously drops the base component's conflicting line-height
  class.

## Preserved, unchanged

- Booking validation, the booked-ranges query, and the confirm-before-
  submit step — all via the shared hook, identical behavior to before.
- The request is sent only on confirming in `ConfirmActionDialog`; the
  success toast fires only in its `onSuccess` callback, after the
  mutation actually resolves — unchanged.
- Calendars render inline, no popover — this was already true before
  this change; nothing needed to change there.
- The admin dialog and `/admin/borrow` — not touched at all.

## Verification

```
npm run typecheck   → passed
npm run lint         → passed, 0 errors (3 pre-existing informational warnings)
npm run test         → passed, 69/69 (unchanged — this is layout/
                        presentation, not new pure logic)
npm run build        → passed
```

Confirmed via curl against the running dev server: both `/member/
catalog` and `/admin/borrow` return 200, the new
`MemberRequestEquipmentDialog.tsx` module resolves, and
`admin-borrow.page.tsx` was confirmed unmodified (still calls
`RequestEquipmentAction` with no `variant`, defaulting to `"admin"`).

## Not verified — needs a real browser, and the actual screenshot

No browser automation exists in this environment. Unverified: the
member dialog actually matches the 760px/24px/20px layout visually,
the calendars are genuinely centered with no leftover empty space, the
type scale renders as specified, mobile stacking and scroll behavior
work on a short viewport, RTL mirrors correctly in Arabic, and the
admin dialog is pixel-identical to before. Also worth re-checking
against the actual design screenshot once it can be attached — the
written spec was followed exactly, but a visual reference may reveal
details text alone didn't capture.
