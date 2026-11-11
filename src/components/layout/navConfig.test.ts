import { describe, expect, it } from "vitest"
import { ADMIN_NAV_ITEMS, isNavItemActive, type NavItem } from "./navConfig"
import { LayoutDashboard } from "lucide-react"

function item(partial: Partial<NavItem>): NavItem {
  return { labelKey: "x", to: "/admin", icon: LayoutDashboard, ...partial }
}

describe("isNavItemActive", () => {
  describe("exact items (e.g. Overview)", () => {
    const overview = item({ to: "/admin", exact: true })

    it("is active on its own exact path", () => {
      expect(isNavItemActive("/admin", overview)).toBe(true)
    })

    it("is NOT active on a deeper admin page — the reported bug", () => {
      expect(isNavItemActive("/admin/categories", overview)).toBe(false)
      expect(isNavItemActive("/admin/catalog", overview)).toBe(false)
      expect(isNavItemActive("/admin/requests", overview)).toBe(false)
    })
  })

  describe("plain items with no exact/alsoActiveOn (e.g. Borrow equipment)", () => {
    const categories = item({ to: "/admin/categories" })

    it("is active on its own path", () => {
      expect(isNavItemActive("/admin/categories", categories)).toBe(true)
    })

    it("is active on a nested path under it", () => {
      expect(isNavItemActive("/admin/categories/sub", categories)).toBe(true)
    })

    it("is NOT active on a sibling admin page", () => {
      expect(isNavItemActive("/admin", categories)).toBe(false)
      expect(isNavItemActive("/admin/catalog", categories)).toBe(false)
    })
  })

  describe("items with alsoActiveOn (e.g. All Requests + its detail page)", () => {
    const allRequests = item({ to: "/admin/requests", alsoActiveOn: ["/admin/request"] })

    it("is active on the list page", () => {
      expect(isNavItemActive("/admin/requests", allRequests)).toBe(true)
    })

    it("is active on the detail page, which lives outside its own path", () => {
      expect(isNavItemActive("/admin/request/abc-123", allRequests)).toBe(true)
    })

    it("is NOT active on an unrelated admin page", () => {
      expect(isNavItemActive("/admin", allRequests)).toBe(false)
      expect(isNavItemActive("/admin/catalog", allRequests)).toBe(false)
    })
  })
})

describe("ADMIN_NAV_ITEMS: Equipment + Categories merged into one Catalog link", () => {
  it("has exactly one catalog-management entry, not two", () => {
    const catalogItems = ADMIN_NAV_ITEMS.filter(
      (navItem) => navItem.to === "/admin/catalog" || navItem.to === "/admin/categories"
    )
    expect(catalogItems).toHaveLength(1)
  })

  const catalogLink = ADMIN_NAV_ITEMS.find((navItem) => navItem.to === "/admin/catalog")!

  it("points at /admin/catalog — the Equipment tab", () => {
    expect(catalogLink.to).toBe("/admin/catalog")
  })

  it("stays highlighted on both the Equipment and Categories pages", () => {
    expect(isNavItemActive("/admin/catalog", catalogLink)).toBe(true)
    expect(isNavItemActive("/admin/categories", catalogLink)).toBe(true)
  })

  it("is NOT highlighted on an unrelated admin page", () => {
    expect(isNavItemActive("/admin", catalogLink)).toBe(false)
    expect(isNavItemActive("/admin/requests", catalogLink)).toBe(false)
    expect(isNavItemActive("/admin/borrow", catalogLink)).toBe(false)
  })

  it("uses a label key distinct from the in-page Equipment/Categories tabs", () => {
    // CatalogTabs.tsx reads nav.adminCatalog/nav.adminCategories directly
    // for the two tabs inside the page — those must keep reading
    // "Equipment"/"Categories" there, so the merged sidebar link uses its
    // own key rather than repurposing either one.
    expect(catalogLink.labelKey).not.toBe("nav.adminCatalog")
    expect(catalogLink.labelKey).not.toBe("nav.adminCategories")
  })
})
