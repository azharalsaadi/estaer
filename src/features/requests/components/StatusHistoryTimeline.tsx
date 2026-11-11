import { useTranslation } from "react-i18next"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { useStatusHistory } from "../hooks/useStatusHistory"
import { REQUEST_STATUS_LABEL_KEYS } from "../requests.constants"

type StatusHistoryTimelineProps = {
  requestId: string
  requestOwnerId: string
  requestOwnerEmail?: string
}

export function StatusHistoryTimeline({
  requestId,
  requestOwnerId,
  requestOwnerEmail,
}: StatusHistoryTimelineProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const historyQuery = useStatusHistory(requestId)

  const actorLabel = (actorId: string): string => {
    if (actorId === user?.id) return t("requests.historyByYou")
    if (actorId === requestOwnerId) {
      return requestOwnerEmail
        ? t("requests.historyBy", { email: requestOwnerEmail })
        : t("requests.historyByMember")
    }
    return t("requests.historyByAdmin")
  }

  return (
    <div>
      <h2 className="text-foreground text-lg font-semibold">
        {t("requests.historyTitle")}
      </h2>
      <div className="border-border mt-4 border-s-2 ps-5">
        {historyQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          (historyQuery.data ?? []).map((entry) => (
            <div key={entry.id} className="mb-5">
              <p className="text-foreground text-sm">
                ● {t(REQUEST_STATUS_LABEL_KEYS[entry.to_status])}
              </p>
              <p className="text-muted-foreground text-xs">
                {actorLabel(entry.actor_id)}
              </p>
              {entry.note && (
                <p className="text-muted-foreground mt-1 text-xs italic">
                  "{entry.note}"
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
