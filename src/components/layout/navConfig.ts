import { Boxes, ClipboardList, Handshake, LayoutDashboard, ListChecks } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type NavItem = {
  labelKey: string
  to: string
  icon: LucideIcon
  /**
   * TanStack Router's default `Link` active-match is a path-segment
   * PREFIX match (`exact: false`) — so a link to a short path like
   * "/admin" is considered active on every deeper path too
   * ("/admin/categories", "/admin/catalog", ...), not just on "/admin"
   * itself. Set `exact: true` for any nav item whose `to` is itself a
   * path PREFIX of another item's `to` (Overview's "/admin" is a prefix
   * of every other admin route), so it only highlights on its own exact
   * page.
   */
  exact?: boolean
  /**
   * Extra path prefixes that should also count as "on this section" —
   * for a detail route that exists outside its list page's own path
   * (e.g. "/admin/request/$id" is NOT nested under "/admin/requests",
   * it's a sibling path, so the default prefix match never reaches it).
   */
  alsoActiveOn?: string[]
}

/**
 * Whether `pathname` should highlight `item` in the nav. Used by
 * AdminShell, which renders this exact list for both the desktop sidebar
 * and the mobile drawer.
 *
 * MemberShell still uses `Link`'s own built-in active-match directly and
 * was left alone — out of scope for the admin-portal fix this was
 * written for — but note it has the identical latent bug: "/member"
 * (Home) is also a path-prefix of "/member/catalog" and
 * "/member/requests", so it likely stays highlighted on those pages too.
 * Switching MemberShell to use this same helper (`exact: true` on Home)
 * would fix it the same way.
 */
export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.to

  return [item.to, ...(item.alsoActiveOn ?? [])].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

/**
 * Member and Admin each get their own flat nav list — there is no combined
 * sidebar and no role filtering here. The portal itself (route layout) is
 * the access boundary; see components/layout/AuthBoundary.tsx.
 */
export const MEMBER_NAV_ITEMS: NavItem[] = [
  { labelKey: "nav.memberHome", to: "/member", icon: LayoutDashboard },
  { labelKey: "nav.memberCatalog", to: "/member/catalog", icon: Boxes },
  { labelKey: "nav.memberRequests", to: "/member/requests", icon: ClipboardList },
]

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { labelKey: "nav.adminOverview", to: "/admin", icon: LayoutDashboard, exact: true },
  {
    labelKey: "nav.adminRequests",
    to: "/admin/requests",
    icon: ListChecks,
    alsoActiveOn: ["/admin/request"],
  },
  // One sidebar/drawer link for both catalog-management pages — "Catalog"
  // (nav.adminCatalogGroup, deliberately a DIFFERENT key from
  // nav.adminCatalog/nav.adminCategories, which still label the Equipment/
  // Categories tabs *inside* the page via CatalogTabs.tsx and must keep
  // reading "Equipment"/"Categories" there, unchanged). Routes to the
  // Equipment tab; alsoActiveOn keeps it highlighted on the Categories
  // tab too, since that page lives at a separate path ("/admin/categories")
  // rather than nested under "/admin/catalog".
  {
    labelKey: "nav.adminCatalogGroup",
    to: "/admin/catalog",
    icon: Boxes,
    alsoActiveOn: ["/admin/categories"],
  },
  { labelKey: "nav.adminBorrow", to: "/admin/borrow", icon: Handshake },
]
