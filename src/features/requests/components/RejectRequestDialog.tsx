import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useRejectRequest } from "../hooks/useRejectRequest"
import { rejectRequestSchema, type RejectRequestFormData } from "../requests.schema"

type RejectRequestDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: string
}

export function RejectRequestDialog({
  open,
  onOpenChange,
  requestId,
}: RejectRequestDialogProps) {
  const { t } = useTranslation()
  const rejectRequest = useRejectRequest()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RejectRequestFormData>({
    resolver: zodResolver(rejectRequestSchema),
    defaultValues: { reason: "" },
  })

  const onSubmit = handleSubmit((values) => {
    rejectRequest.mutate(
      { requestId, reason: values.reason },
      {
        onSuccess: () => {
          toast.success(t("requests.requestRejected"))
          onOpenChange(false)
        },
      }
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("requests.rejectDialogTitle")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => void onSubmit(event)} noValidate>
          <div>
            <Label htmlFor="reject-reason">{t("fields.rejectionReason")}</Label>
            <Textarea
              id="reject-reason"
              className="mt-1.5"
              placeholder={t("fields.rejectionReasonPlaceholder")}
              {...register("reason")}
            />
            {errors.reason && (
              <p className="text-destructive mt-1.5 text-xs">
                {t(errors.reason.message ?? "")}
              </p>
            )}
          </div>
          {rejectRequest.error && (
            <p className="text-destructive text-xs" role="alert">
              {t(`serverErrors.${rejectRequest.error.code}`, {
                defaultValue: t("serverErrors.default"),
              })}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={rejectRequest.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={rejectRequest.isPending}>
              {t("requests.reject")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
