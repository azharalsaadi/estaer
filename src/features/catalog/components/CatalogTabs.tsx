import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

/** Equipment/Categories tab nav shared by the two admin catalog-management
 * pages — both routes already exist independently; this just links them. */
export function CatalogTabs() {
  const { t } = useTranslation()

  return (
    <nav className="border-border flex gap-6 border-b">
      <Link
        to="/admin/catalog"
        className="text-muted-foreground border-b-2 border-transparent pb-3 text-sm"
        activeProps={{ className: "border-primary font-semibold text-primary" }}
      >
        {t("nav.adminCatalog")}
      </Link>
      <Link
        to="/admin/categories"
        className="text-muted-foreground border-b-2 border-transparent pb-3 text-sm"
        activeProps={{ className: "border-primary font-semibold text-primary" }}
      >
        {t("nav.adminCategories")}
      </Link>
    </nav>
  )
}
