import { createRoute, lazyRouteComponent } from "@tanstack/react-router"
import { memberLayoutRoute } from "@/router/protected.routes"

export const memberHomeRoute = createRoute({
  getParentRoute: () => memberLayoutRoute,
  path: "/member",
  component: lazyRouteComponent(() => import("./member-home.page")),
})
