import { useTranslation } from "react-i18next"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { StatsRow } from "../components/StatsRow"

export default function AdminOverviewPage() {
  const { t } = useTranslation()
  useDocumentTitle(t("nav.adminOverview"))

  return (
    <div className="space-y-8">
      <div>
        <span className="text-primary text-xs font-bold tracking-[2px] uppercase">
          {t("adminOverview.eyebrow")}
        </span>
        <h1 className="text-foreground my-3 text-[32px] font-semibold">
          {t("adminOverview.heading")}
        </h1>
        <p className="text-muted-foreground max-w-xl text-sm">
          {t("adminOverview.body")}
        </p>
      </div>
      <StatsRow />
    </div>
  )
}
