import { useTranslation } from "react-i18next"
import { StatePanel } from "@/components/shared/StatePanel"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { RequestDetailView } from "../components/RequestDetailView"
import { useRequest } from "../hooks/useRequest"
import { memberRequestDetailRoute } from "./member-request-detail.route"

export default function MemberRequestDetailPage() {
  const { t } = useTranslation()
  const { requestId } = memberRequestDetailRoute.useParams()
  const requestQuery = useRequest(requestId, false)
  useDocumentTitle(t("requests.detailReference"))

  if (requestQuery.isLoading) {
    return <StatePanel variant="empty" title={t("common.loading")} />
  }
  if (requestQuery.isError) {
    return (
      <StatePanel
        variant="error"
        title={t("requests.loadErrorTitle")}
        onRetry={() => void requestQuery.refetch()}
      />
    )
  }
  if (!requestQuery.data) {
    return (
      <StatePanel
        variant="empty"
        title={t("requests.detailNotFoundTitle")}
        body={t("requests.detailNotFoundBody")}
      />
    )
  }

  return <RequestDetailView request={requestQuery.data} isAdmin={false} />
}
