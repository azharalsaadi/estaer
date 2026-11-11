import { useTranslation } from "react-i18next"
import { StatePanel } from "@/components/shared/StatePanel"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { RequestDetailView } from "../components/RequestDetailView"
import { useRequest } from "../hooks/useRequest"
import { adminRequestDetailRoute } from "./admin-request-detail.route"

export default function AdminRequestDetailPage() {
  const { t } = useTranslation()
  const { requestId } = adminRequestDetailRoute.useParams()
  const requestQuery = useRequest(requestId, true)
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

  return <RequestDetailView request={requestQuery.data} isAdmin={true} />
}
