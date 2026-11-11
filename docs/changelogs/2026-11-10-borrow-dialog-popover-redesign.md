# 2026-11-10 — Borrow dialog: popover date fields, fixed day-cell merging, revised sizing

No screenshot came through with this request either (same as the two
prior redesign requests) — only the detailed text spec, which was
precise enough to implement directly. This revision **supersedes**
some of the immediately preceding session's choices where they
conflict — 560px (not 760px), popover-based fields (not always-open
inline calendars), 20px/28px semibold title (not 24px/32px bold) — on
the read that the user iterated after seeing the actual rendered
result.

## Real bug fixed: adjacent booked days were visually merging

Traced why two adjacent highlighted days looked like one solid block
instead of two separate teal cells: `CalendarDayButton` (the shared
`ui/calendar.tsx` primitive) only applies `rounded-*` **conditionally**,
for `react-day-picker`'s native multi-day range-selection mode — which
this app never uses (`mode="single"` everywhere). With no unconditional
border-radius and no gap between adjacent day buttons, two
side-by-side highlighted days shared a flat, square edge and read as
one rectangle.

Fixed in `BookingCalendar.tsx`'s `BookedDayButton` wrapper — the one
place that already owns booked-day styling — with two unconditional
(not just for booked days) additions: `m-0.5` (a ~4px gap between any
two adjacent day buttons, 2px contributed by each side) and
`rounded-full` (every day's highlight, booked or selected, is now an
individually rounded circle, never flush with its neighbor). No change
needed to the shared `ui/calendar.tsx` primitive itself.

## Date fields: closed-by-default popovers, not always-open calendars

This reverses the explicit "keep both calendars open" instruction from
two sessions ago, per this session's explicit new spec. Added the
shadcn `popover` component (same `cn`-package-import CLI quirk as every
prior `shadcn add` in this project — fixed the same way, import
corrected to `@/lib/utils`, package uninstalled).

New `DateFieldPopover.tsx`: a button styled like a normal text input
(selected date or a placeholder, sized/bordered/focus-ringed to match
the existing `Input` component) with a trailing calendar icon, opening
`BookingCalendar` in a `PopoverContent` on click. Radix's Popover
handles viewport collision avoidance on its own (repositions near an
edge rather than clipping or causing horizontal scroll) — nothing extra
was needed for that requirement.

`RequestEquipmentFormDialog` holds one piece of state,
`openField: "start" | "end" | null` (default `null` — both closed on
open), passed to both date fields' `open`/`onOpenChange` — opening one
is the same action as closing the other, so only one can ever be open.
Each field's `onChange` wrapper closes its own popover immediately
after a date is picked.

`BookingCalendar` no longer carries its own border/frame
(`border-border rounded-lg border` removed, now just `w-fit`) — since
it's now always shown inside a `PopoverContent`, which already
provides the border, shadow, and rounding; keeping both would have
nested two visible boxes.

## Sizing (this session's spec)

- Dialog: `max-w-[560px]`, same responsive `p-4 sm:p-6` padding as
  before (16px mobile / 24px desktop — unchanged, still correct).
- Title: `text-xl leading-7 font-semibold` (20px/28px — Tailwind's
  bundled `text-xl` pair matches exactly).
- Equipment name: `text-base` (16px, within the given 15–16px range),
  kept `font-semibold` for visual distinction from the body text below
  it.
- Date fields: `grid-cols-1 sm:grid-cols-2 gap-4` (16px gap, uniform
  across breakpoints this time — the responsive 16/20px split from the
  prior session's calendar grid no longer applies, since there's one
  `gap-4` value specified now for the whole field row).
- Field/helper text sizing (`text-sm leading-5`, 14px/20px) carried
  forward unchanged from the prior session — not contradicted by this
  spec, and "visually balanced" with the new title/name sizes.

## Preserved, unchanged

- `useRequestEquipmentForm` — booking rules, validation, the
  confirm-before-submit step, and the mutation are completely
  untouched. The request is still sent only from `ConfirmActionDialog`'s
  Confirm action, and the success toast still fires only in its
  `onSuccess` callback.
- Shared by both `/member/catalog` and `/admin/borrow` through the
  same `RequestEquipmentFormDialog` — one redesign, both pages, no
  separate admin/member variant needed (confirmed unchanged from the
  prior session's consolidation).

## Verification

```
npm run typecheck   → passed
npm run lint         → passed, 0 errors (3 pre-existing informational warnings)
npm run test         → passed, 69/69 (unchanged — this is layout/
                        interaction-pattern work, not new pure logic;
                        the disabled-day rules it reuses were already
                        covered by bookingOverlap.test.ts)
npm run build        → passed
```

Confirmed via curl against the running dev server: both pages return
200, `popover.tsx` and `DateFieldPopover.tsx` resolve, and the dialog's
source contains the new `max-w-[560px]`.

## Not verified — needs a real browser, and the actual screenshot

No browser automation exists in this environment. Unverified, exactly
what the request asked to check: the date fields show a clear visible
gap, both calendars start closed, opening one closes any other open
one, a calendar closes itself after a date is picked, adjacent
highlighted days now read as visibly separate teal circles rather than
a merged block, the popover repositions instead of clipping near a
viewport edge, and the whole dialog looks correct in Arabic RTL and
English LTR on both desktop and mobile widths.
