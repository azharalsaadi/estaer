# 2026-11-09 — Visibility dropdown → on/off switch (category + equipment dialogs)

## Change

`CategoryDialog.tsx` and `ItemDialog.tsx`'s Visibility field was a
`Select` with two options ("Active — visible to members" / "Inactive —
hidden from members"). Replaced with the existing shadcn `Switch`
component (`src/components/ui/switch.tsx` — already in the component
library, unused until now):

```tsx
<Label htmlFor="category-visibility">{t("fields.visibility")}</Label>
<Controller
  control={control}
  name="active"
  render={({ field }) => (
    <div className="mt-1.5 flex items-center gap-2.5">
      <Switch id="category-visibility" checked={field.value} onCheckedChange={field.onChange} />
      <span className="text-foreground text-sm font-medium">
        {field.value ? t("catalog.active") : t("catalog.inactive")}
      </span>
    </div>
  )}
/>
<p className="text-muted-foreground mt-1.5 text-xs">
  {t("adminCatalog.categoryVisibilityHelp")}
</p>
```

Identical structure in both dialogs (the item one uses
`adminCatalog.equipmentVisibilityHelp`). "Visibility" stays the field
label; the existing `catalog.active`/`catalog.inactive` keys ("Active"/
"Inactive", "فعّال"/"غير فعّال") already matched what was asked, so no
new state-label keys were needed. The per-state helper paragraph that
used to sit below the field as its own `bg-muted` box now lives directly
under the switch row instead — tighter, and reads naturally as "what
this switch does" rather than a separate callout.

Removed the now-unused `catalog.visibleToMembers`/
`catalog.hiddenFromMembers` keys (both locales) — grepped first to
confirm nothing else referenced them.

## Why no custom styling was needed

The existing `Switch` component already matches the requested look
exactly, via the project's own design tokens — nothing to add:
- Checked (active): `bg-primary` → `#007f7c`, teal.
- Unchecked (inactive): `bg-input` → `#ccdcd8`, neutral.
- Thumb: `bg-background` → `#fbfdfc`, white.
- RTL: the thumb's translate classes already have `rtl:` variants
  (`rtl:...-translate-x-...`), so it flips sides correctly under Arabic.
- Keyboard + focus: Radix's `Switch` primitive is a native
  `role="switch"` toggled by Space/Enter; `focus-visible:ring-3
  focus-visible:ring-ring/50` is already on the component.
- Label association: `<Label htmlFor>` + `<Switch id>` — clicking the
  "Visibility" label also toggles the switch.

## What stayed untouched, deliberately

- **Status badges in the tables** (`admin-catalog.page.tsx`,
  `admin-categories.page.tsx`) — still the same read-only `Badge`,
  unchanged; this task only touched the create/edit dialogs.
- **The single "Catalog" sidebar entry** and the **separate Equipment /
  Categories tabs** inside the page — not touched by this change at all.
- **Save/Cancel mechanics** — unchanged. The switch is just a different
  control bound to the same react-hook-form `active` field; `Save`
  still submits current form values via `createItemApi`/`updateItemApi`
  (or the category equivalents), and `Cancel` still just closes the
  dialog without submitting — since the parent page remounts the dialog
  fresh via a `key` prop every time it opens, any untouched toggle is
  discarded automatically, exactly as the old `Select` field already
  behaved.

## Verification

```
npm run typecheck   → passed
npm run lint         → passed, 0 errors (3 pre-existing informational warnings)
npm run test         → passed, 50/50 (unchanged — no new pure-logic unit
                        here; this is form-binding/DOM behavior already
                        covered by this project's existing test scope)
npm run build        → passed
```

## Not verified — needs a real browser

No browser automation exists in this environment. Unverified:
- Toggling the switch in both dialogs visually shows teal/gray + the
  correct Active/Inactive label, in both English (LTR) and Arabic
  (RTL — thumb should visibly sit on the opposite side).
- Keyboard-only interaction (Tab to the switch, Space/Enter to toggle)
  and a visible focus ring.
- Saving each state for both a category and an item persists correctly,
  and reopening that same edit dialog shows the switch in the saved
  position.
- Clicking Cancel after toggling discards the change (the item/category
  keeps its previous state when reopened).
