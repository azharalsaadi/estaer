import { useTranslation } from "react-i18next"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { GuestStatsRow } from "../components/GuestStatsRow"
import { MemberHero } from "../components/MemberHero"
import { StatsRow } from "../components/StatsRow"

export default function MemberHomePage() {
  const { t } = useTranslation()
  useDocumentTitle(t("nav.memberHome"))
  const { isAuthenticated } = useAuth()

  return (
    <div className="space-y-8">
      <MemberHero />
      {/* Signed out: zeroed stats, no fetch of private requests data —
       * there is no separate personal-requests list on this page to
       * hide beyond these cards. Signed in: real stats, unchanged. */}
      {isAuthenticated ? <StatsRow /> : <GuestStatsRow />}
    </div>
  )
}
