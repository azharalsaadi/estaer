import { createRoute, lazyRouteComponent } from "@tanstack/react-router"
import { publicLayoutRoute } from "@/router/public.routes"

export type AdminLoginSearch = {
  redirect?: string
}

export const adminLoginRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: "/admin/login",
  validateSearch: (search: Record<string, unknown>): AdminLoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: lazyRouteComponent(() => import("./admin-login.page")),
})
