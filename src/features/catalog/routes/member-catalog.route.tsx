import { createRoute, lazyRouteComponent } from "@tanstack/react-router"
import { memberLayoutRoute } from "@/router/protected.routes"

export type MemberCatalogSearch = {
  category?: string
}

export const memberCatalogRoute = createRoute({
  getParentRoute: () => memberLayoutRoute,
  path: "/member/catalog",
  validateSearch: (search: Record<string, unknown>): MemberCatalogSearch => ({
    category:
      typeof search.category === "string" && search.category.length > 0
        ? search.category
        : undefined,
  }),
  component: lazyRouteComponent(() => import("./member-catalog.page")),
})
