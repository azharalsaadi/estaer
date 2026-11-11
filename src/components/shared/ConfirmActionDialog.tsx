import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type ConfirmActionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** A plain sentence (most callers) or a small structured review —
   * e.g. the equipment name and dates before submitting a borrowing
   * request. A plain string is still valid ReactNode, so this widening
   * doesn't change any existing caller. */
  body?: ReactNode
  onConfirm: () => void
  isPending: boolean
  errorMessage?: string | null
}

/** A simple confirm dialog may use local open state per
 * docs/STRUCTURE.md's dialog conventions — used wherever an action needs
 * a yes/no confirmation step but no form (Cancel/Return/Approve a
 * request, or confirming Add Equipment/Add Category before saving). */
export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  body,
  onConfirm,
  isPending,
  errorMessage,
}: ConfirmActionDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {body && <div className="text-muted-foreground text-sm">{body}</div>}
        {errorMessage && (
          <p className="text-destructive text-xs" role="alert">
            {errorMessage}
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isPending}>
            {t("common.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
