import { useTranslation } from "react-i18next"
import { StatCard } from "./StatCard"

/**
 * The signed-out variant of StatsRow — same cards, same labels, but
 * always zero and never fetches anything. Deliberately a separate
 * component rather than a flag on StatsRow: that keeps
 * useDashboardStats() (still used by the authenticated member view and
 * the admin dashboard) from ever being called for a signed-out visitor,
 * so there is no request to RLS-protected `requests` data to even fail.
 */
export function GuestStatsRow() {
  const { t } = useTranslation()

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        label={t("dashboard.pendingRequests")}
        hint={t("dashboard.pendingRequestsHint")}
        accentClassName="bg-[#c3c3c3]"
        value={0}
        isLoading={false}
      />
      <StatCard
        label={t("dashboard.equipmentOnLoan")}
        hint={t("dashboard.equipmentOnLoanHint")}
        accentClassName="bg-[#c3c3c3]"
        value={0}
        isLoading={false}
      />
      <StatCard
        label={t("dashboard.overdueReturns")}
        hint={t("dashboard.overdueReturnsHint")}
        accentClassName="bg-[#c0c0c0]"
        value={0}
        isLoading={false}
      />
    </div>
  )
}
