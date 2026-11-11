import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { REQUEST_STATUS_LABEL_KEYS, REQUEST_STATUS_STYLES } from "../requests.constants"
import { isOverdue } from "../lib/dates"
import type { RequestStatus } from "../requests.types"

type RequestStatusBadgeProps = {
  status: RequestStatus
  endDate: string
}

/** Overdue is a derived condition shown as a SEPARATE badge next to the
 * status — never a status value itself (REQUIREMENTS.md §13/§16). */
export function RequestStatusBadge({ status, endDate }: RequestStatusBadgeProps) {
  const { t } = useTranslation()
  const overdue = isOverdue(status, endDate)

  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge variant="outline" className={REQUEST_STATUS_STYLES[status]}>
        {t(REQUEST_STATUS_LABEL_KEYS[status])}
      </Badge>
      {overdue && (
        <Badge
          variant="outline"
          className="border-destructive/30 bg-destructive/10 text-destructive"
        >
          {t("requests.overdueBadge")}
        </Badge>
      )}
    </span>
  )
}
