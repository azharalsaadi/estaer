import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { StatePanel } from "@/components/shared/StatePanel"
import { CatalogTabs } from "../components/CatalogTabs"
import { CategoryDialog } from "../components/CategoryDialog"
import { useAllCategories } from "../hooks/useAllCategories"
import { adminCategoriesRoute } from "./admin-categories.route"

export default function AdminCategoriesPage() {
  const { t } = useTranslation()
  useDocumentTitle(t("nav.adminCategories"))

  const { dialog, categoryId } = adminCategoriesRoute.useSearch()
  const navigate = useNavigate()
  const categoriesQuery = useAllCategories()

  const categories = categoriesQuery.data ?? []
  const editingCategory = categoryId
    ? categories.find((category) => category.id === categoryId)
    : undefined

  const openCreateDialog = () => {
    void navigate({
      to: "/admin/categories",
      search: { dialog: "create" },
      replace: true,
    })
  }

  const openEditDialog = (id: string) => {
    void navigate({
      to: "/admin/categories",
      search: { dialog: "edit", categoryId: id },
      replace: true,
    })
  }

  const closeDialog = () => {
    void navigate({ to: "/admin/categories", search: {}, replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-foreground text-2xl font-semibold">
          {t("nav.adminCategories")}
        </h1>
        <Button type="button" onClick={openCreateDialog}>
          {t("adminCatalog.addCategory")}
        </Button>
      </div>

      <CatalogTabs />

      {categoriesQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : categoriesQuery.isError ? (
        <StatePanel
          variant="error"
          title={t("adminCatalog.loadCategoriesErrorTitle")}
          onRetry={() => void categoriesQuery.refetch()}
        />
      ) : categories.length === 0 ? (
        <StatePanel variant="empty" title={t("adminCatalog.noCategoriesFound")} />
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("adminCatalog.tableCategoryName")}</TableHead>
                <TableHead>{t("fields.visibility")}</TableHead>
                <TableHead className="text-end" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        category.active ? "border-success/30 text-success-foreground" : ""
                      }
                    >
                      {category.active ? t("catalog.active") : t("catalog.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => openEditDialog(category.id)}
                    >
                      {t("common.edit")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CategoryDialog
        key={`${dialog ?? "closed"}-${categoryId ?? "new"}`}
        open={dialog === "create" || dialog === "edit"}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
        category={dialog === "edit" ? editingCategory : undefined}
      />
    </div>
  )
}
