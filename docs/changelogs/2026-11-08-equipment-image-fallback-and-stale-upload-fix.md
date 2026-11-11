# 2026-11-08 — Equipment image display: category fallbacks + stale-upload fix

## Design assets: already correctly handled, verified not re-done

Checked `Estaer-Design-Handoff/Estaer-Design-Handoff/design-reference/assets`
by magic bytes, as asked, since several files are named `.png` but are not:

| File | Named as | Actual format |
|---|---|---|
| `cables.png` | PNG | SVG (`<svg xmlns=...`) |
| `cameras.png` | PNG | SVG |
| `equipment-pattern.png` | PNG | SVG |
| `laptops.png` | PNG | SVG |
| `projectors.png` | PNG | SVG |
| `estaer-logo.png` | PNG | genuine PNG (`\x89PNG\r\n...`) |

`web/public/assets/{cables,cameras,equipment-pattern,laptops,projectors}.svg`
and `web/public/assets/estaer-logo.png` already exist from earlier work,
byte-identical (`diff`-confirmed) to the correctly-identified source
files. `getCategoryIllustration()`
(`src/features/catalog/lib/categoryIcon.ts`) already maps `cables` /
`cameras` / `laptops` / `projectors` to these SVGs. No asset or mapping
change was needed — only the fallback *logic* using them was incomplete
(below).

## Root cause of the MON-001 broken image

`uploadItemImageApi()` (`src/features/catalog/apis/items.api.ts`) wrote
every image to the exact same fixed, extension-less storage path for a
given item — `"<itemId>/cover"` — specifically so a replacement upload
overwrote the old object instead of orphaning it.

That fixed path is also the bug: Supabase Storage's public URLs are
served through a cache. Re-uploading to the *same* path never changes
the URL the `<img>` tag uses, so the browser (and any intermediate
cache) is free to keep serving whatever it previously cached for that
exact URL — a prior broken/failed upload, in MON-001's case — even
though a direct, fresh request to the object (bypassing that cache)
correctly returns the newly uploaded content. That is exactly the
reported symptom: the direct request for `cover` returned `200 OK` with
the new image, while the page's own `<img>` kept showing the old
(broken) cached response for the same URL.

This was always latent in the fixed-path design; it surfaces on every
*second or later* upload to the same item, which is what the admin
workflow (edit → replace image → save) does.

## Fix: a unique object path per upload, old object cleaned up after

`uploadItemImageApi(itemId, file, previousImagePath?)` now:
1. Uploads to `"<itemId>/<crypto.randomUUID()><ext>"` — a path nothing
   has ever cached before, every time.
2. Records that new path on `items.image_path`.
3. Best-effort deletes the previous object (if any) — a failure here is
   logged (`console.error`) but does not fail the upload, which already
   succeeded and is already saved on the item; preserves the original
   "don't orphan objects" intent without reintroducing the fixed-path
   problem.

`ItemDialog` now passes the item's current `image_path` through as
`previousImagePath` so the old object is cleaned up on replacement.
`useUploadItemImage`'s mutation input grew the same optional field; its
`["items"]` query invalidation was already correct and unchanged.

No storage RLS policy change was needed — `0005_item_images.sql`'s
policies are scoped by `bucket_id = 'equipment-images'` only, not by
filename pattern, so any path under the bucket is already covered.

## Fix: uploaded image → category image → generic icon, on actual failure too

`EquipmentCard` (member catalog + admin "Borrow equipment" — both via
`CatalogBrowseView`) previously only fell back to the category
illustration when `item.image_path` was `null`. If an uploaded image's
URL existed but failed to *load* (404, deleted object, network error),
nothing caught it — the bare `<img>` had no `onError` handler, so it
showed the browser's broken-image icon instead of falling through.

Added `onError` fallback in `EquipmentCard`: on a failed load, re-renders
using the category illustration instead; if the category has none, the
existing generic `Package` icon (already the project's default
placeholder) is shown, matching "uploaded image → category image → no
match → existing default" exactly. The failed URL is tracked by value
(not a boolean) so a later re-upload — a new URL — is tried fresh rather
than staying stuck on the fallback.

Applied the same pattern to the smaller image preview in `ItemDialog`
(admin edit form), which had the identical gap for a previously-saved
image that no longer loads.

## Verification

```
npm run typecheck   → passed
npm run lint         → passed, 0 errors (3 pre-existing informational warnings)
npm run build        → passed
npm run test         → passed, 31/31 (unchanged — this fix is storage/
                        network/browser-rendering behavior, not pure
                        logic, consistent with this project's existing
                        test scope)
```

No RLS policy, Supabase project, account, or data was touched. The
`items`/storage access layer (`items.api.ts`) remains the only module
calling the Supabase SDK for this feature.

## Not verified (needs a real browser + authenticated session)

No browser automation or Supabase credentials exist in this
environment, so the following need manual confirmation:

- Re-uploading an image for an existing item (e.g. MON-001) now shows
  the new image immediately on `/admin/catalog`, `/admin/borrow`, and
  `/member/catalog` — the actual end-to-end fix for the reported bug.
- An item with no uploaded image, in a known category (cables/cameras/
  laptops/projectors), shows that category's illustration on both
  `/admin/borrow` and `/member/catalog`.
- An item whose uploaded image URL is deliberately broken (e.g. the
  storage object deleted out-of-band) falls back to its category
  illustration rather than a broken-image icon.
- An item in a category with no illustration, and no uploaded image,
  shows the generic placeholder icon.
- The previous storage object is actually removed after a replacement
  upload (checked via the Storage browser in the Supabase dashboard).
