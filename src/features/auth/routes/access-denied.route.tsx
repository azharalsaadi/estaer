import { createRoute, lazyRouteComponent } from "@tanstack/react-router"
import { memberLayoutRoute } from "@/router/protected.routes"

export const accessDeniedRoute = createRoute({
  getParentRoute: () => memberLayoutRoute,
  path: "/access-denied",
  component: lazyRouteComponent(() => import("./access-denied.page")),
})
