import { Link } from "@tanstack/react-router"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { ConfirmActionDialog } from "@/components/shared/ConfirmActionDialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { CommentsSection } from "./CommentsSection"
import { RejectRequestDialog } from "./RejectRequestDialog"
import { RequestStatusBadge } from "./RequestStatusBadge"
import { StatusHistoryTimeline } from "./StatusHistoryTimeline"
import { useApproveRequest } from "../hooks/useApproveRequest"
import { useCancelRequest } from "../hooks/useCancelRequest"
import { useReturnRequest } from "../hooks/useReturnRequest"
import { getReturnDueDate } from "../lib/dates"
import type { Request } from "../requests.types"

type RequestDetailViewProps = {
  request: Request
  isAdmin: boolean
}

export function RequestDetailView({ request, isAdmin }: RequestDetailViewProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isOwner = user?.id === request.user_id

  const [rejectOpen, setRejectOpen] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  const approveRequest = useApproveRequest()
  const returnRequest = useReturnRequest()
  const cancelRequest = useCancelRequest()

  return (
    <div className="space-y-6">
      <Link
        to={isAdmin ? "/admin/requests" : "/member/requests"}
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← {t("requests.backToRequests")}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-primary text-xs font-bold tracking-[2px] uppercase">
            {t("requests.detailReference")} #{request.id.slice(0, 8)}
          </span>
          <h1 className="text-foreground mt-2 text-2xl font-semibold">
            {request.item.name}
          </h1>
        </div>
        <RequestStatusBadge status={request.status} endDate={request.end_date} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="border-border bg-card space-y-6 rounded-xl border p-6">
          <div>
            <p className="text-muted-foreground text-xs">
              {t("requests.detailEquipment")}
            </p>
            <p className="text-foreground font-medium">
              {request.item.name} · {request.item.category_name}
            </p>
            <p className="text-muted-foreground text-xs" dir="ltr">
              {request.item.serial_number}
            </p>
          </div>

          {isAdmin && (
            <div>
              <p className="text-muted-foreground text-xs">
                {t("requests.detailBorrower")}
              </p>
              <p className="text-foreground font-medium">
                {request.borrower_email ?? "—"}
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-muted-foreground text-xs">
                {t("requests.detailStartDate")}
              </p>
              <p dir="ltr" className="text-foreground font-medium">
                {request.start_date}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">
                {t("requests.detailLastDayOfUse")}
              </p>
              <p dir="ltr" className="text-foreground font-medium">
                {request.end_date}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">
                {t("requests.detailReturnDue")}
              </p>
              <p dir="ltr" className="text-foreground font-medium">
                {getReturnDueDate(request.end_date)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground text-xs">{t("requests.detailReason")}</p>
            {/* Untrusted text rendered as plain text only. */}
            <p className="text-foreground whitespace-pre-wrap">{request.reason}</p>
          </div>

          {isAdmin && request.status === "pending" && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setRejectOpen(true)}>
                  {t("requests.reject")}
                </Button>
                <Button
                  disabled={approveRequest.isPending}
                  onClick={() =>
                    approveRequest.mutate(request.id, {
                      onSuccess: () => toast.success(t("requests.requestApproved")),
                    })
                  }
                >
                  {t("requests.approve")}
                </Button>
              </div>
              {approveRequest.error && (
                <p className="text-destructive text-xs" role="alert">
                  {t(`serverErrors.${approveRequest.error.code}`, {
                    defaultValue: t("serverErrors.default"),
                  })}
                </p>
              )}
            </div>
          )}

          {isAdmin && request.status === "approved" && (
            <Button onClick={() => setReturnOpen(true)}>
              {t("requests.markReturned")}
            </Button>
          )}

          {!isAdmin && isOwner && request.status === "pending" && (
            <Button variant="secondary" onClick={() => setCancelOpen(true)}>
              {t("requests.cancelRequest")}
            </Button>
          )}

          <CommentsSection
            requestId={request.id}
            requestOwnerId={request.user_id}
            requestOwnerEmail={request.borrower_email}
          />
        </div>

        <div className="border-border bg-card rounded-xl border p-6">
          <StatusHistoryTimeline
            requestId={request.id}
            requestOwnerId={request.user_id}
            requestOwnerEmail={request.borrower_email}
          />
        </div>
      </div>

      <RejectRequestDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        requestId={request.id}
      />

      <ConfirmActionDialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        title={t("requests.confirmReturnTitle")}
        body={t("requests.confirmReturnBody")}
        isPending={returnRequest.isPending}
        errorMessage={
          returnRequest.error
            ? t(`serverErrors.${returnRequest.error.code}`, {
                defaultValue: t("serverErrors.default"),
              })
            : null
        }
        onConfirm={() =>
          returnRequest.mutate(request.id, {
            onSuccess: () => {
              toast.success(t("requests.requestReturned"))
              setReturnOpen(false)
            },
          })
        }
      />

      <ConfirmActionDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("requests.confirmCancelTitle")}
        body={t("requests.confirmCancelBody")}
        isPending={cancelRequest.isPending}
        errorMessage={
          cancelRequest.error
            ? t(`serverErrors.${cancelRequest.error.code}`, {
                defaultValue: t("serverErrors.default"),
              })
            : null
        }
        onConfirm={() =>
          cancelRequest.mutate(request.id, {
            onSuccess: () => {
              toast.success(t("requests.requestCancelled"))
              setCancelOpen(false)
            },
          })
        }
      />
    </div>
  )
}
