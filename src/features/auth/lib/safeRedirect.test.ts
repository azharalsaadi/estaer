import { describe, expect, it } from "vitest"
import {
  getRoleHomePath,
  resolvePostLoginDestination,
  toSafeRedirectPath,
} from "./safeRedirect"

describe("toSafeRedirectPath", () => {
  it("allows a plain internal path", () => {
    expect(toSafeRedirectPath("/admin/catalog", "/member")).toBe("/admin/catalog")
  })

  it("falls back when there is no candidate", () => {
    expect(toSafeRedirectPath(undefined, "/member")).toBe("/member")
  })

  it("rejects a protocol-relative URL (open-redirect attempt)", () => {
    expect(toSafeRedirectPath("//evil.example.com", "/member")).toBe("/member")
  })

  it("rejects an absolute external URL", () => {
    expect(toSafeRedirectPath("https://evil.example.com", "/member")).toBe("/member")
  })

  it("rejects a scheme-relative URL hidden after a slash", () => {
    expect(toSafeRedirectPath("/https://evil.example.com", "/member")).toBe("/member")
  })

  it("rejects a backslash trick some browsers normalize to a slash", () => {
    expect(toSafeRedirectPath("/\\evil.example.com", "/member")).toBe("/member")
  })

  it("rejects a path with no leading slash", () => {
    expect(toSafeRedirectPath("evil.example.com", "/member")).toBe("/member")
  })
})

describe("getRoleHomePath", () => {
  it("is /admin for an admin", () => {
    expect(getRoleHomePath("admin")).toBe("/admin")
  })

  it("is /member for a member", () => {
    expect(getRoleHomePath("member")).toBe("/member")
  })
})

describe("resolvePostLoginDestination", () => {
  it("sends an admin to their requested admin page", () => {
    expect(resolvePostLoginDestination("/admin/catalog", "admin")).toBe("/admin/catalog")
  })

  it("sends a member to their requested member page", () => {
    expect(resolvePostLoginDestination("/member/requests", "member")).toBe(
      "/member/requests"
    )
  })

  it("does NOT send a member to an admin page they requested — role home instead", () => {
    expect(resolvePostLoginDestination("/admin/catalog", "member")).toBe("/member")
  })

  it("allows an admin to land on a member page they requested (admins retain member abilities)", () => {
    expect(resolvePostLoginDestination("/member/catalog", "admin")).toBe(
      "/member/catalog"
    )
  })

  it("falls back to the admin's own role home with no requested destination", () => {
    expect(resolvePostLoginDestination(undefined, "admin")).toBe("/admin")
  })

  it("falls back to the member's own role home with no requested destination", () => {
    expect(resolvePostLoginDestination(undefined, "member")).toBe("/member")
  })

  it("still blocks an open-redirect attempt regardless of role", () => {
    expect(resolvePostLoginDestination("https://evil.example.com", "admin")).toBe(
      "/admin"
    )
  })
})
