import { createRoute, lazyRouteComponent } from "@tanstack/react-router"
import { adminLayoutRoute } from "@/router/protected.routes"

export const adminOverviewRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin",
  component: lazyRouteComponent(() => import("./admin-overview.page")),
})
