import { Outlet, createRoute } from "@tanstack/react-router"
import { rootRoute } from "./root.route"

/**
 * Pathless layout for screens reachable while signed out. Only
 * authentication-related pages (member/admin login) attach here — the
 * Member home is protected, not a public landing page (REQUIREMENTS.md §11).
 */
export const publicLayoutRoute = createRoute({
  id: "public-layout",
  getParentRoute: () => rootRoute,
  component: () => <Outlet />,
})
