# 2026-11-09 — Confirm before submitting a borrowing request

## Change

`RequestEquipmentDialog` (the Submit request form, shared by
`/admin/borrow` and `/member/catalog`) now opens a confirmation step
after validation passes and before the request is actually created —
reusing `ConfirmActionDialog`, the exact same shared component already
used for Add Equipment/Add Category and for Cancel/Return request.

Flow:
1. **Submit request** (إرسال الطلب) still runs `handleSubmit` — zod
   validation, unchanged. An invalid form shows field errors and stops
   there, as always.
2. If valid: the validated values are snapshotted
   (`pendingValues`) and the confirmation dialog opens, title
   **"Are you sure you want to submit this borrowing request?"** /
   **"هل أنت متأكد من إرسال طلب الاستعارة؟"**. Its body is a small
   review list — equipment name, start date, last day of use, and the
   computed return due date — rather than one run-on sentence.
3. **Confirm submission** (تأكيد الإرسال) runs the actual
   `createRequest` mutation. Its button is disabled while pending
   (`ConfirmActionDialog`'s existing `isPending` behavior — no new
   code needed). On success, shows the new specific toast
   ("Your borrowing request was submitted and is pending review." /
   "تم إرسال طلب الاستعارة بنجاح، وهو الآن قيد المراجعة.") and closes
   both dialogs.
4. **Cancel** (إلغاء) just closes the confirmation
   (`ConfirmActionDialog`'s own `onOpenChange(false)`) — the Submit
   form underneath was never touched, so every date/reason the member
   entered is exactly as they left it.
5. On a failed submission: the confirmation closes and the Submit form
   reappears with its existing inline error
   (`serverErrors.<code>`/`serverErrors.default`) and every input
   intact — this was already the dialog's behavior before this change;
   only the extra confirmation step is new.

## Reused, not rebuilt: widened `ConfirmActionDialog`'s `body` to `ReactNode`

Previously `body?: string`. The task needs a small structured review
(name + 3 dates), not one sentence, so `body` now accepts any
`ReactNode` — a plain string is still valid, so this is backward
compatible with every existing caller (Add Equipment, Add Category,
Cancel request, Return request — none needed any change). Also
switched the wrapping element from `<p>` to `<div>`, since nesting a
`<dl>` inside a `<p>` is invalid HTML.

New key `requests.confirmSubmitTitle` with the exact wording given.
`requests.requestSubmitted` (only ever used in this one dialog) was
updated to the new specific wording, and `requests.submitRequest`'s
English text changed from "Send request" to "Submit request" to match
exactly — its Arabic text was already "إرسال الطلب", unchanged.

## Preserved, unchanged

- The whole booking-calendar/availability-check flow from the prior
  sessions (highlighted/disabled booked days, range-crossing
  validation, the booked-ranges query) — none of it was touched.
- The pending-approval workflow — this only adds a client-side
  confirmation step before the same `create_request` call; nothing
  about request status transitions changed.
- Admin's own confirm-before-save pattern for equipment/categories —
  untouched, same shared component, no behavior change there.

## Verification

```
npm run typecheck   → passed
npm run lint         → passed, 0 errors (3 pre-existing informational warnings)
npm run test         → passed, 69/69 (unchanged — this is dialog-flow/
                        form-state behavior, not new pure logic)
npm run build        → passed
```

Confirmed via curl against the running dev server that `/member/
catalog` and `/admin/borrow` still return 200 and the updated dialog
source (containing `confirmSubmitTitle`) is what's actually being
served.

## Not verified — needs a real browser

No browser automation exists in this environment. Unverified: filling
out the form and clicking Submit request shows the confirmation with
the correct equipment name and dates in both languages; Confirm
submission disables while sending and shows the new success toast;
Cancel returns to the form with every input intact; a forced failure
(e.g. a genuine date conflict) shows the existing inline error with
inputs preserved.
