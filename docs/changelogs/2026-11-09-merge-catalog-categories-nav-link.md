# 2026-11-09 — Merge Equipment + Categories into one "Catalog" sidebar link

## Change

`ADMIN_NAV_ITEMS` (`navConfig.ts`) had two separate entries — Equipment
(`/admin/catalog`) and Categories (`/admin/categories`). Replaced both
with one entry:

```ts
{
  labelKey: "nav.adminCatalogGroup", // new key: "Catalog" / "الكتالوج"
  to: "/admin/catalog",              // clicking it opens the Equipment tab
  icon: Boxes,
  alsoActiveOn: ["/admin/categories"], // stays highlighted on the Categories page too
}
```

`AdminShell`'s `AdminNavLinks` already computes active state through
`isNavItemActive()` (added for the previous Overview-highlight fix), so
`alsoActiveOn` was all that was needed — no further AdminShell change.
That one component is already shared by both the desktop sidebar and
the mobile drawer, so the merge applies to both automatically.

## What stayed untouched, deliberately

- **Both routes** (`/admin/catalog`, `/admin/categories`) — unchanged,
  still independent pages.
- **`CatalogTabs.tsx`** — the in-page Equipment/Categories tab switcher
  ("the pink arrows") — not touched at all. It already reads
  `nav.adminCatalog`/`nav.adminCategories` (still "Equipment"/
  "Categories", unchanged) and already highlights only the selected tab
  correctly, since neither of those two paths is a prefix of the other
  — confirmed in the prior nav-fix changelog, re-confirmed here.
- The new sidebar label uses a **separate** key,
  `nav.adminCatalogGroup` ("Catalog" / "الكتالوج"), specifically so
  renaming the sidebar link could never also rename the in-page tab or
  page heading, which both still read `nav.adminCatalog` directly.
- Forms, filters, and data: nothing in either page's query/mutation
  logic changed.

## Verification

```
npm run typecheck   → passed
npm run lint         → passed, 0 errors (3 pre-existing informational warnings)
npm run test         → passed, 50/50 (5 new, in navConfig.test.ts)
npm run build        → passed
```

New tests assert directly against the real `ADMIN_NAV_ITEMS` array:
exactly one catalog-management nav entry (not two), it points at
`/admin/catalog`, it's active on both `/admin/catalog` and
`/admin/categories`, it's inactive elsewhere, and its label key is
neither `nav.adminCatalog` nor `nav.adminCategories` (guards against
accidentally reusing — and thus renaming — the in-page tab labels).

## Not verified — needs a real browser

No browser automation exists in this environment. Unverified: the
sidebar/drawer now show one "Catalog" link instead of two; clicking it
opens `/admin/catalog` with the Equipment tab shown; the Catalog link
stays highlighted while switching to the Categories tab; admins can
still create/edit equipment and categories exactly as before.
