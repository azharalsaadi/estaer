import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { RequestEquipmentAction } from "@/features/requests/components/RequestEquipmentAction"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { CatalogBrowseView } from "../components/CatalogBrowseView"
import { memberCatalogRoute } from "./member-catalog.route"

export default function MemberCatalogPage() {
  const { t } = useTranslation()
  useDocumentTitle(t("nav.memberCatalog"))

  const { category } = memberCatalogRoute.useSearch()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <h1 className="text-foreground text-2xl font-semibold">{t("nav.memberCatalog")}</h1>
      <CatalogBrowseView
        category={category}
        onCategoryChange={(categoryId) => {
          void navigate({
            to: "/member/catalog",
            search: { category: categoryId },
            replace: true,
          })
        }}
        renderCardFooter={(item) => <RequestEquipmentAction item={item} />}
      />
    </div>
  )
}
