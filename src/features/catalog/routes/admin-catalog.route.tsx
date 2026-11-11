import { createRoute, lazyRouteComponent } from "@tanstack/react-router"
import { adminLayoutRoute } from "@/router/protected.routes"

export type AdminCatalogSearch = {
  dialog?: "create" | "edit"
  itemId?: string
  q?: string
  visibility?: "active" | "inactive"
}

export const adminCatalogRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/catalog",
  validateSearch: (search: Record<string, unknown>): AdminCatalogSearch => {
    const dialog =
      search.dialog === "create" || search.dialog === "edit" ? search.dialog : undefined
    const itemId =
      typeof search.itemId === "string" && search.itemId.length > 0
        ? search.itemId
        : undefined
    const q = typeof search.q === "string" ? search.q : undefined
    const visibility =
      search.visibility === "active" || search.visibility === "inactive"
        ? search.visibility
        : undefined

    return { dialog, itemId: dialog === "edit" ? itemId : undefined, q, visibility }
  },
  component: lazyRouteComponent(() => import("./admin-catalog.page")),
})
