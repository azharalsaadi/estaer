import { createRoute, lazyRouteComponent } from "@tanstack/react-router"
import { memberLayoutRoute } from "@/router/protected.routes"

export const memberRequestDetailRoute = createRoute({
  getParentRoute: () => memberLayoutRoute,
  path: "/member/request/$requestId",
  component: lazyRouteComponent(() => import("./member-request-detail.page")),
})
