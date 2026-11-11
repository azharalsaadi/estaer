import { createRoute, lazyRouteComponent } from "@tanstack/react-router"
import { adminLayoutRoute } from "@/router/protected.routes"

export const adminRequestDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/request/$requestId",
  component: lazyRouteComponent(() => import("./admin-request-detail.page")),
})
