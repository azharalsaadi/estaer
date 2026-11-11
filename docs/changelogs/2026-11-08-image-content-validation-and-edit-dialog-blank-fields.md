# 2026-11-08 — MON-001's actual bug: an SVG renamed to `.png`, not the upload pipeline

## What the downloaded object actually was

Downloaded the exact object the browser requested
(`5677d44c-.../047f8863-....png`, 200 OK, `Content-Type: image/png`,
593 bytes) directly from the public bucket and inspected its bytes:

```
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240">...
```

It is byte-for-byte identical to `web/public/assets/laptops.svg` — which
is itself byte-identical to `Estaer-Design-Handoff/.../design-reference/
assets/laptops.png` (the same mislabeled-as-PNG design asset identified
in the earlier image-fallback work). The file actually selected in the
edit form's file picker was that design asset, not a photo — an SVG
text file, uploaded with a `.png`-derived name and a browser-reported
`image/png` MIME type that has nothing to do with its real content.

**This confirms the upload pipeline itself was never broken.** The
previous fix (unique path per upload, verified via the console log and
the new UUID path in the URL) worked exactly as intended — it uploaded
whatever file was selected, under a fresh URL, and `Content-Type:
image/png`/200 OK/`CF-Cache-Status: MISS` all check out. The browser
correctly refused to render SVG markup as a PNG and showed the broken-
image placeholder — that part was also working correctly from the
browser's point of view. The actual defect was upstream: nothing in the
app validated that the *selected file's bytes* matched an actual image
format before accepting it.

## Root cause

`file.type` — checked in `ItemDialog`'s `onImageChange` against
`ITEM_IMAGE_ALLOWED_TYPES` — is a value the **browser derives from the
file's name/extension**, not its content. A text file renamed to end in
`.png` reports `file.type === "image/png"` and sails through that
check, then through the 5 MB size check, then through
`uploadItemImageApi` (which trusts the same `file.type` as the Storage
`contentType`), and 200s on every subsequent fetch — it is a perfectly
valid HTTP response for content that is not a decodable image.

## Fix: validate actual file bytes, not the declared MIME type

New: `src/features/catalog/lib/imageSignature.ts` —
`hasValidImageSignature(file)` reads the file's first 12 bytes and
checks them against the real magic numbers for PNG (`\x89PNG\r\n\x1a\n`),
JPEG (`\xFF\xD8\xFF`), and WebP (`RIFF....WEBP`). Pure, no network/DOM
dependency beyond `File.prototype.slice().arrayBuffer()`.

`ItemDialog.onImageChange` now runs this check after the existing
type/size checks and before accepting the file, surfacing a new,
specific message (`validation.imageInvalidContent`, both locales) if
the bytes don't match any of the three — `getCategoryIllustration`'s
SVG fallbacks are untouched; nothing about rejecting invalid uploads
changes how fallbacks render.

Added 6 unit tests (`imageSignature.test.ts`), including one that
reproduces the exact MON-001 case byte-for-byte (an SVG tag renamed
`.png`, `file.type: "image/png"`) and asserts it is rejected.

## Second bug: edit dialog shows blank fields on a direct URL load

Traced `admin-catalog.page.tsx`: `useAllItems()` starts loading
asynchronously, and `editingItem = items.find(...)` is computed from
`itemsQuery.data ?? []` — empty until that query resolves. The
`<ItemDialog>`'s remount `key` was `` `${dialog}-${itemId}` ``, which
does **not** change as the query goes from loading → loaded. On a
normal "click Edit from the table" flow this is invisible, because the
table can only render (and the Edit button only exists) after
`itemsQuery` has already resolved — `item` is already correct at the
dialog's first mount.

But on a **direct** load of an edit URL (page refresh, bookmark, shared
link), the dialog mounts immediately from the URL's search params,
before `itemsQuery` has any data. `item` is `undefined` at that first
mount, so `useForm`'s `defaultValues` — read only once, at mount —
capture blank `name`/`category_id`/`serial_number`. Once `itemsQuery`
resolves a moment later and the real item is found, `ItemDialog`
receives the correct `item` prop, but doesn't remount (same key), so
react-hook-form never re-reads it — the fields stay blank forever, and saving at that point would silently
overwrite the item's name/category/serial number with blanks.

## Fix

`admin-catalog.page.tsx`'s dialog key now also encodes
`itemsQuery.isSuccess`, forcing exactly one remount — with correct
`defaultValues` — the moment the query transitions from loading to
loaded:

```ts
key={`${dialog ?? "closed"}-${itemId ?? "new"}-${
  itemsQuery.isSuccess ? "ready" : "loading"
}`}
```

The normal click-to-edit path is unaffected (`itemsQuery` is already
`isSuccess` by the time that button can even exist). "Preserves values
when changing only the photo" was not a separate bug — it was a direct
symptom of this one: once fields populate correctly, submitting without
touching them submits their current (correct) values as always,
exactly like every other unedited field already did.

## Verification

```
npm run typecheck   → passed
npm run lint         → passed, 0 errors (3 pre-existing informational warnings)
npm run build        → passed
npm run test         → passed, 37/37 (6 new)
```

Confirmed by direct HTTP download + magic-byte inspection that the
MON-001 object is genuinely SVG content, not a decode/caching/RLS
issue. No RLS, migration, or Supabase project/data change.

## Not verified (needs a real browser + a real photo)

- Re-uploading an actual photo (not a design SVG) for MON-001 now
  renders correctly in the edit preview, `/admin/borrow`, and
  `/member/catalog` after save + refresh.
- The new validation message appears, and the file is rejected before
  upload, when selecting a mislabeled file like
  `Estaer-Design-Handoff/.../laptops.png` again.
- Opening an edit URL directly (paste/refresh) now populates
  name/serial/category correctly once the item loads, instead of
  staying blank.
- Changing only the photo on that now-populated form preserves the
  other fields on save.

No browser automation or authenticated Supabase session exists in this
environment; the HTTP-level object download/inspection above was done
directly against the public bucket (no auth required), independent of
any browser.
