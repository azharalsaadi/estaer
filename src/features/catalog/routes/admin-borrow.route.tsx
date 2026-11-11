import { createRoute, lazyRouteComponent } from "@tanstack/react-router"
import { adminLayoutRoute } from "@/router/protected.routes"

export type AdminBorrowSearch = {
  category?: string
}

export const adminBorrowRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/borrow",
  validateSearch: (search: Record<string, unknown>): AdminBorrowSearch => ({
    category:
      typeof search.category === "string" && search.category.length > 0
        ? search.category
        : undefined,
  }),
  component: lazyRouteComponent(() => import("./admin-borrow.page")),
})
