import { createRoute, lazyRouteComponent } from "@tanstack/react-router"
import { memberLayoutRoute } from "@/router/protected.routes"
import { REQUEST_STATUS_OPTIONS } from "../requests.constants"
import type { RequestStatus } from "../requests.types"

export type MemberRequestsSearch = {
  status?: RequestStatus
  category?: string
}

export const memberRequestsRoute = createRoute({
  getParentRoute: () => memberLayoutRoute,
  path: "/member/requests",
  validateSearch: (search: Record<string, unknown>): MemberRequestsSearch => ({
    status: REQUEST_STATUS_OPTIONS.includes(search.status as RequestStatus)
      ? (search.status as RequestStatus)
      : undefined,
    category:
      typeof search.category === "string" && search.category.length > 0
        ? search.category
        : undefined,
  }),
  component: lazyRouteComponent(() => import("./member-requests.page")),
})
