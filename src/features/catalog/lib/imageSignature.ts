const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff]
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46] // "RIFF"
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50] // "WEBP", at offset 8 in a RIFF container

function matchesAt(bytes: Uint8Array, signature: number[], offset: number): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte)
}

/**
 * Validates a file's actual bytes against known image magic numbers,
 * instead of trusting `file.type` — which the browser derives from the
 * file's NAME/extension, not its content. A text file (e.g. an SVG)
 * renamed to end in ".png" reports `file.type === "image/png"` and would
 * pass any extension- or declared-MIME-type-only check, then upload fine
 * (Supabase Storage stores whatever `contentType` it's told) and 200 OK
 * on fetch, yet never render — the exact failure this catches before
 * upload, with a clear message instead of a silent broken image later.
 */
export async function hasValidImageSignature(file: File): Promise<boolean> {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (matchesAt(header, PNG_SIGNATURE, 0)) return true
  if (matchesAt(header, JPEG_SIGNATURE, 0)) return true
  if (matchesAt(header, RIFF_SIGNATURE, 0) && matchesAt(header, WEBP_SIGNATURE, 8)) return true
  return false
}
