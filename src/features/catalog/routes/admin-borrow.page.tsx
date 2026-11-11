import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { RequestEquipmentAction } from "@/features/requests/components/RequestEquipmentAction"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { CatalogBrowseView } from "../components/CatalogBrowseView"
import { adminBorrowRoute } from "./admin-borrow.route"

export default function AdminBorrowPage() {
  const { t } = useTranslation()
  useDocumentTitle(t("nav.adminBorrow"))

  const { category } = adminBorrowRoute.useSearch()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <h1 className="text-foreground text-2xl font-semibold">{t("nav.adminBorrow")}</h1>
      <CatalogBrowseView
        category={category}
        onCategoryChange={(categoryId) => {
          void navigate({
            to: "/admin/borrow",
            search: { category: categoryId },
            replace: true,
          })
        }}
        renderCardFooter={(item) => <RequestEquipmentAction item={item} />}
      />
    </div>
  )
}
