# 2026-11-09 — Specific "added successfully" toast for Add Equipment / Add Category

## Change

Both dialogs already showed a success toast (via `sonner`'s `toast`,
the app's existing notification component, already wired to the themed
`<Toaster/>` in `App.tsx` with RTL-aware position/direction) on a
successful save — but used the same generic message ("Equipment
saved."/"Category saved.") for both create and edit. Added two new
keys and branched on `isEditMode`, which was already in scope in both
components:

- `adminCatalog.equipmentAdded`: "Equipment added successfully." /
  "تمت إضافة المعدّة بنجاح"
- `adminCatalog.categoryAdded`: "Category added successfully." /
  "تمت إضافة الفئة بنجاح"

`CategoryDialog.tsx`:
```ts
toast.success(isEditMode ? t("adminCatalog.categorySaved") : t("adminCatalog.categoryAdded"))
```

`ItemDialog.tsx` — the message is computed once (`savedMessage`) and
used at both of its two existing success sites: immediately when no
image was selected, or after the image upload itself succeeds when one
was. The ordering was already correct before this change (the toast
only ever fired after a selected image's upload resolved, never
before) — only which *text* is shown changed.

Edit mode keeps the original "Equipment saved."/"Category saved."
wording — unchanged, since the task asked specifically about the Add
forms.

## Already correct, confirmed unchanged

- **List refresh**: `useCreateItem`/`useCreateCategory`'s
  `onSuccess: () => queryClient.invalidateQueries({ queryKey: [...] })`
  — untouched.
- **Failure handling**: on any save error (or an image-upload error
  specifically), the dialog stays open (`onOpenChange(false)` is never
  called on an error path), the form's current values are untouched
  (react-hook-form state persists since the component doesn't
  unmount), and a translated error is shown inline
  (`serverErrorCode`/the dedicated `imageUploadFailed` toast) — this
  was already the existing behavior, re-confirmed by reading both
  dialogs' error paths, not something this change needed to add.

## Verification

```
npm run typecheck   → passed
npm run lint         → passed, 0 errors (3 pre-existing informational warnings)
npm run test         → passed, 50/50
npm run build        → passed
```

## Not verified — needs a real browser

No browser automation exists in this environment. Unverified: filling
out and saving Add Equipment and Add Category in both English and
Arabic shows the exact specified toast text, in the selected language,
only after the save (and image upload, if one was attached) succeeds;
the dialog then closes and the list reflects the new row; a forced
failure keeps the dialog open with inputs intact and a clear error
visible.
