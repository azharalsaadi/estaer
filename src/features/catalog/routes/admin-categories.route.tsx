import { createRoute, lazyRouteComponent } from "@tanstack/react-router"
import { adminLayoutRoute } from "@/router/protected.routes"

export type AdminCategoriesSearch = {
  dialog?: "create" | "edit"
  categoryId?: string
}

export const adminCategoriesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/categories",
  validateSearch: (search: Record<string, unknown>): AdminCategoriesSearch => {
    const dialog =
      search.dialog === "create" || search.dialog === "edit" ? search.dialog : undefined
    const categoryId =
      typeof search.categoryId === "string" && search.categoryId.length > 0
        ? search.categoryId
        : undefined

    return { dialog, categoryId: dialog === "edit" ? categoryId : undefined }
  },
  component: lazyRouteComponent(() => import("./admin-categories.page")),
})
