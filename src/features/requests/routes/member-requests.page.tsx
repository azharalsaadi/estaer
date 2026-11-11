import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { StatePanel } from "@/components/shared/StatePanel"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { RequestFiltersBar } from "../components/RequestFiltersBar"
import { RequestsTable } from "../components/RequestsTable"
import { useMyRequests } from "../hooks/useMyRequests"
import { memberRequestsRoute } from "./member-requests.route"

export default function MemberRequestsPage() {
  const { t } = useTranslation()
  useDocumentTitle(t("nav.memberRequests"))

  const { status, category } = memberRequestsRoute.useSearch()
  const navigate = useNavigate()
  const requestsQuery = useMyRequests({ status, categoryId: category })

  const updateSearch = (next: { status?: typeof status; category?: string }) => {
    void navigate({
      to: "/member/requests",
      search: (prev) => ({ ...prev, ...next }),
      replace: true,
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-foreground text-2xl font-semibold">
        {t("nav.memberRequests")}
      </h1>

      <RequestFiltersBar
        status={status}
        categoryId={category}
        onStatusChange={(value) => updateSearch({ status: value })}
        onCategoryChange={(value) => updateSearch({ category: value })}
      />

      {requestsQuery.isLoading ? (
        <StatePanel variant="empty" title={t("common.loading")} />
      ) : requestsQuery.isError ? (
        <StatePanel
          variant="error"
          title={t("requests.loadErrorTitle")}
          onRetry={() => void requestsQuery.refetch()}
        />
      ) : (requestsQuery.data ?? []).length === 0 ? (
        <StatePanel
          variant="empty"
          title={t("requests.emptyTitle")}
          body={t("requests.emptyBody")}
        />
      ) : (
        <RequestsTable requests={requestsQuery.data ?? []} variant="member" />
      )}
    </div>
  )
}
