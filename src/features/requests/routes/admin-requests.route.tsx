import { createRoute, lazyRouteComponent } from "@tanstack/react-router"
import { adminLayoutRoute } from "@/router/protected.routes"
import { REQUEST_STATUS_OPTIONS } from "../requests.constants"
import type { RequestStatus } from "../requests.types"

export type AdminRequestsSearch = {
  status?: RequestStatus
  category?: string
}

export const adminRequestsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/requests",
  validateSearch: (search: Record<string, unknown>): AdminRequestsSearch => ({
    status: REQUEST_STATUS_OPTIONS.includes(search.status as RequestStatus)
      ? (search.status as RequestStatus)
      : undefined,
    category:
      typeof search.category === "string" && search.category.length > 0
        ? search.category
        : undefined,
  }),
  component: lazyRouteComponent(() => import("./admin-requests.page")),
})
