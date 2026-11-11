import { useTranslation } from "react-i18next"
import { useDashboardStats } from "../hooks/useDashboardStats"
import { StatCard } from "./StatCard"

export function StatsRow() {
  const { t } = useTranslation()
  const statsQuery = useDashboardStats()
  const isLoading = statsQuery.isLoading
  const hasError = statsQuery.isError

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t("dashboard.pendingRequests")}
          hint={t("dashboard.pendingRequestsHint")}
          accentClassName="bg-[#c3c3c3]"
          value={statsQuery.data?.pending}
          isLoading={isLoading}
        />
        <StatCard
          label={t("dashboard.equipmentOnLoan")}
          hint={t("dashboard.equipmentOnLoanHint")}
          accentClassName="bg-[#c3c3c3]"
          value={statsQuery.data?.onLoan}
          isLoading={isLoading}
        />
        <StatCard
          label={t("dashboard.overdueReturns")}
          hint={t("dashboard.overdueReturnsHint")}
          accentClassName="bg-[#c0c0c0]"
          value={statsQuery.data?.overdue}
          isLoading={isLoading}
        />
      </div>
      {hasError && (
        <p className="text-destructive mt-3 text-xs">{t("requests.loadErrorTitle")}</p>
      )}
    </div>
  )
}
