import { createRoute, createRouter, redirect } from "@tanstack/react-router"
import { FullPageSpinner } from "@/components/shared/FullPageSpinner"
import { NotFoundPage } from "@/components/shared/NotFoundPage"
import { AUTH_SESSION_QUERY_OPTIONS } from "@/features/auth/hooks/useAuth"
import { accessDeniedRoute } from "@/features/auth/routes/access-denied.route"
import { adminLoginRoute } from "@/features/auth/routes/admin-login.route"
import { memberLoginRoute } from "@/features/auth/routes/member-login.route"
import { adminBorrowRoute } from "@/features/catalog/routes/admin-borrow.route"
import { adminCatalogRoute } from "@/features/catalog/routes/admin-catalog.route"
import { adminCategoriesRoute } from "@/features/catalog/routes/admin-categories.route"
import { memberCatalogRoute } from "@/features/catalog/routes/member-catalog.route"
import { adminOverviewRoute } from "@/features/dashboard/routes/admin-overview.route"
import { memberHomeRoute } from "@/features/dashboard/routes/member-home.route"
import { adminRequestDetailRoute } from "@/features/requests/routes/admin-request-detail.route"
import { adminRequestsRoute } from "@/features/requests/routes/admin-requests.route"
import { memberRequestDetailRoute } from "@/features/requests/routes/member-request-detail.route"
import { memberRequestsRoute } from "@/features/requests/routes/member-requests.route"
import { queryClient } from "@/lib/queryClient"
import { publicLayoutRoute } from "./public.routes"
import { adminLayoutRoute, memberLayoutRoute } from "./protected.routes"
import { rootRoute } from "./root.route"

/**
 * The bare root is just a dispatcher — it has no content of its own. An
 * admin lands on /admin, a member (or a signed-out visitor, who gets
 * bounced onward to /login by memberLayoutRoute's own guard) lands on
 * /member. Previously this unconditionally sent EVERYONE to /member
 * regardless of role, which meant any navigation that resolved to "/"
 * dropped an admin into the member portal with no say in it.
 */
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(AUTH_SESSION_QUERY_OPTIONS)
    const destination = user?.role === "admin" ? "/admin" : "/member"
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- see note in protected.routes.tsx
    throw redirect({ to: destination })
  },
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  publicLayoutRoute.addChildren([memberLoginRoute, adminLoginRoute]),
  memberLayoutRoute.addChildren([
    memberHomeRoute,
    memberCatalogRoute,
    memberRequestsRoute,
    memberRequestDetailRoute,
    accessDeniedRoute,
  ]),
  adminLayoutRoute.addChildren([
    adminOverviewRoute,
    adminRequestsRoute,
    adminRequestDetailRoute,
    adminCatalogRoute,
    adminCategoriesRoute,
    adminBorrowRoute,
  ]),
])

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  defaultPendingComponent: FullPageSpinner,
  defaultNotFoundComponent: NotFoundPage,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
