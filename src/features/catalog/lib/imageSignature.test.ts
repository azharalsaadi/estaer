import { describe, expect, it } from "vitest"
import { hasValidImageSignature } from "./imageSignature"

function fileFromBytes(bytes: number[], name: string, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type })
}

describe("hasValidImageSignature", () => {
  it("accepts a real PNG", async () => {
    const file = fileFromBytes(
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0],
      "photo.png",
      "image/png"
    )
    expect(await hasValidImageSignature(file)).toBe(true)
  })

  it("accepts a real JPEG", async () => {
    const file = fileFromBytes(
      [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0],
      "photo.jpg",
      "image/jpeg"
    )
    expect(await hasValidImageSignature(file)).toBe(true)
  })

  it("accepts a real WebP", async () => {
    // RIFF <4-byte size> WEBP
    const file = fileFromBytes(
      [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
      "photo.webp",
      "image/webp"
    )
    expect(await hasValidImageSignature(file)).toBe(true)
  })

  it("rejects an SVG renamed to .png — the exact MON-001 bug", async () => {
    const svgBytes = Array.from(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">'))
    // The browser derives `file.type` from the NAME, not the content, so
    // this reports "image/png" exactly like a real PNG would.
    const file = fileFromBytes(svgBytes, "laptops.png", "image/png")
    expect(await hasValidImageSignature(file)).toBe(false)
  })

  it("rejects an empty file", async () => {
    const file = fileFromBytes([], "empty.png", "image/png")
    expect(await hasValidImageSignature(file)).toBe(false)
  })

  it("rejects arbitrary binary data that isn't any known image format", async () => {
    const file = fileFromBytes([0, 1, 2, 3, 4, 5, 6, 7], "mystery.png", "image/png")
    expect(await hasValidImageSignature(file)).toBe(false)
  })
})
