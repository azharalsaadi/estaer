# 2026-11-09 — Confirm before saving a new category or equipment item

## Change

Add Equipment and Add Category now open a confirmation step after
validation passes and before anything is actually saved or uploaded.
Edit mode is unaffected — it still saves directly on Save, exactly as
before; only the *create* path gained the extra step.

Flow in both dialogs:
1. `Save` still runs `handleSubmit` (Zod validation, unchanged). An
   invalid form shows field errors and stops there, as always.
2. If valid **and** this is a create (`!isEditMode`): instead of saving
   immediately, store the validated values and open the confirmation
   dialog. The Add form dialog stays open underneath, untouched.
3. **Confirm** (تأكيد) runs the exact same save logic the form used to
   run directly on Save — create the record, then (equipment only)
   upload the selected image if any. The existing success toast
   (`equipmentAdded`/`categoryAdded`, from the previous change) fires
   only once that fully completes; on success both dialogs close.
4. **Cancel** (إلغاء) just closes the confirmation dialog
   (`onOpenChange(false)` on its own local state) — nothing else is
   touched, so the Add form's fields and selected image file are
   exactly as left.
5. On a save/upload error: the confirmation dialog closes, landing back
   on the Add form with the existing inline error
   (`serverErrorCode`/`imageUploadFailed` toast) and all inputs intact —
   the same retry behavior already established for this dialog, not
   something new.

## Reused, not rebuilt: `ConfirmActionDialog`

Found an existing, already-generic confirm dialog used for the
Cancel/Return request actions (`features/requests/components/
ConfirmActionDialog.tsx`), built on the shared `Dialog` primitive. It
was feature-scoped to `requests/` and hardcoded a `requests.confirm`
label, so to reuse it properly from `catalog/` (rather than reaching
across a feature boundary) it moved to `src/components/shared/
ConfirmActionDialog.tsx`, with two small generalizations:
- `body` is now optional (the two new catalog confirmations have only a
  single question, no second line — nothing was invented to fill it).
- its Confirm button now reads `common.confirm` instead of
  `requests.confirm` (identical text, "Confirm"/"تأكيد" — the key moved
  to `common`, not duplicated, since it was only ever used in this one
  component).

`RequestDetailView.tsx`'s two existing usages (Return/Cancel request)
were updated to the new import path and are otherwise untouched —
same props, same visible text, same behavior.

New keys: `adminCatalog.confirmAddEquipment` / `confirmAddCategory`,
with the exact wording given.

## Verification

```
npm run typecheck   → passed
npm run lint         → passed, 0 errors (3 pre-existing informational warnings)
npm run test         → passed, 50/50 (unchanged — this is dialog-flow/
                        form-state behavior, not new pure logic)
npm run build        → passed
```

## Not verified — needs a real browser

No browser automation exists in this environment. Unverified: filling
out and submitting both Add forms in English and Arabic shows the
confirmation dialog with the exact specified text before anything is
saved; Confirm actually saves (and uploads the image, for equipment)
and then shows the existing success toast; Cancel returns to the Add
form with the name/category/visibility/image exactly as left; a forced
save failure surfaces the existing error UI with inputs intact; editing
an existing item/category still saves directly with no confirmation
step.
