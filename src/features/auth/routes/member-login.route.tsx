import { createRoute, lazyRouteComponent } from "@tanstack/react-router"
import { publicLayoutRoute } from "@/router/public.routes"

export type MemberLoginSearch = {
  redirect?: string
}

export const memberLoginRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: "/login",
  validateSearch: (search: Record<string, unknown>): MemberLoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: lazyRouteComponent(() => import("./member-login.page")),
})
