import { useState } from "react"
import { Controller } from "react-hook-form"
import { ConfirmActionDialog } from "@/components/shared/ConfirmActionDialog"
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
import { DateFieldPopover } from "./DateFieldPopover"
import { useRequestEquipmentForm } from "../hooks/useRequestEquipmentForm"
import { doesRangeCrossBooking, isDateBooked } from "../lib/bookingOverlap"
import { localDateToIso } from "../lib/dates"

type RequestEquipmentFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemId: string
  itemName: string
}

/**
 * The "New Borrow Request" dialog, shared by both the member and admin
 * borrowing pages (admins retain member borrowing abilities, and use
 * the exact same request-creation rules): a compact field-style date
 * picker (selected date or a placeholder, plus a calendar icon) that
 * opens its calendar in a popover — closed by default, only one open
 * at a time, closes itself after a date is picked — rather than two
 * always-open inline calendars.
 *
 * All actual behavior — validation, the booked-ranges query, the
 * confirm-before-submit step, the mutation, error handling — lives in
 * useRequestEquipmentForm; this component is presentation only.
 */
export function RequestEquipmentFormDialog({
  open,
  onOpenChange,
  itemId,
  itemName,
}: RequestEquipmentFormDialogProps) {
  const {
    t,
    today,
    bookedRangesQuery,
    bookedRanges,
    form: {
      register,
      control,
      formState: { errors },
    },
    startDate,
    onStartDateChange,
    returnDue,
    onSubmit,
    createRequest,
    confirmOpen,
    setConfirmOpen,
    pendingValues,
    confirmReturnDue,
    onConfirmSubmit,
  } = useRequestEquipmentForm(itemId, onOpenChange)

  // Only one of the two date fields' calendars may be open at a time —
  // a single piece of state naturally enforces that: opening one sets
  // this to its own name, which is the same action as closing the
  // other.
  const [openField, setOpenField] = useState<"start" | "end" | null>(null)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-[560px] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl leading-7 font-semibold">
              {t("requests.newRequestTitle")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-foreground -mt-2 text-base leading-6 font-semibold">
            {itemName}
          </p>
          <p className="text-muted-foreground text-sm leading-5">
            {t("requests.newRequestSubtitle")}
          </p>

          <form
            className="space-y-4"
            onSubmit={(event) => void onSubmit(event)}
            noValidate
          >
            {bookedRangesQuery.isLoading ? (
              <p className="text-muted-foreground text-sm leading-5">
                {t("common.loading")}
              </p>
            ) : bookedRangesQuery.isError ? (
              <p className="text-destructive text-sm leading-5" role="alert">
                {t("requests.availabilityCheckFailed")}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex min-w-0 flex-col">
                    <Label htmlFor="request-start-date" className="text-sm leading-5">
                      {t("fields.startDate")}
                    </Label>
                    <div className="mt-1.5">
                      <Controller
                        control={control}
                        name="start_date"
                        render={({ field }) => (
                          <DateFieldPopover
                            id="request-start-date"
                            value={field.value}
                            onChange={onStartDateChange}
                            bookedRanges={bookedRanges}
                            disabled={(date) => {
                              const iso = localDateToIso(date)
                              return iso < today || isDateBooked(iso, bookedRanges)
                            }}
                            placeholder={t("fields.selectDatePlaceholder")}
                            open={openField === "start"}
                            onOpenChange={(isOpen) =>
                              setOpenField(isOpen ? "start" : null)
                            }
                            aria-invalid={!!errors.start_date}
                          />
                        )}
                      />
                    </div>
                    {errors.start_date && (
                      <p className="text-destructive mt-1.5 text-sm leading-5">
                        {t(errors.start_date.message ?? "")}
                      </p>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <Label htmlFor="request-end-date" className="text-sm leading-5">
                      {t("fields.lastDayOfUse")}
                    </Label>
                    <div className="mt-1.5">
                      <Controller
                        control={control}
                        name="end_date"
                        render={({ field }) => (
                          <DateFieldPopover
                            id="request-end-date"
                            value={field.value}
                            onChange={field.onChange}
                            bookedRanges={bookedRanges}
                            disabled={(date) => {
                              const iso = localDateToIso(date)
                              return (
                                iso < startDate ||
                                doesRangeCrossBooking(startDate, iso, bookedRanges)
                              )
                            }}
                            placeholder={t("fields.selectDatePlaceholder")}
                            open={openField === "end"}
                            onOpenChange={(isOpen) => setOpenField(isOpen ? "end" : null)}
                            aria-invalid={!!errors.end_date}
                          />
                        )}
                      />
                    </div>
                    {errors.end_date && (
                      <p className="text-destructive mt-1.5 text-sm leading-5">
                        {t(errors.end_date.message ?? "")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm leading-5">
                  <span
                    className="bg-muted border-border size-3.5 rounded-full border"
                    aria-hidden="true"
                  />
                  <span className="text-muted-foreground">
                    {t("requests.bookedLegend")}
                  </span>
                </div>
              </>
            )}

            {returnDue && (
              <p className="bg-muted text-muted-foreground rounded-lg px-3 py-2.5 text-sm leading-5">
                {t("fields.returnDueDate")}: <span dir="ltr">{returnDue}</span>.{" "}
                {t("requests.returnDueHelp")}
              </p>
            )}

            <div>
              <Label htmlFor="request-reason" className="text-sm leading-5">
                {t("fields.reason")}
              </Label>
              <Textarea
                id="request-reason"
                className="mt-1.5"
                placeholder={t("fields.reasonPlaceholder")}
                {...register("reason")}
              />
              {errors.reason && (
                <p className="text-destructive mt-1.5 text-sm leading-5">
                  {t(errors.reason.message ?? "")}
                </p>
              )}
            </div>

            {createRequest.error && (
              <p className="text-destructive text-sm leading-5" role="alert">
                {t(`serverErrors.${createRequest.error.code}`, {
                  defaultValue: t("serverErrors.default"),
                })}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={createRequest.isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createRequest.isPending || bookedRangesQuery.isError}
              >
                {t("requests.submitRequest")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("requests.confirmSubmitTitle")}
        isPending={createRequest.isPending}
        onConfirm={onConfirmSubmit}
        body={
          pendingValues && (
            <dl className="space-y-1">
              <div className="flex justify-between gap-3">
                <dt>{t("fields.itemName")}</dt>
                <dd className="text-foreground font-medium">{itemName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>{t("fields.startDate")}</dt>
                <dd className="text-foreground font-medium" dir="ltr">
                  {pendingValues.start_date}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>{t("fields.lastDayOfUse")}</dt>
                <dd className="text-foreground font-medium" dir="ltr">
                  {pendingValues.end_date}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>{t("fields.returnDueDate")}</dt>
                <dd className="text-foreground font-medium" dir="ltr">
                  {confirmReturnDue}
                </dd>
              </div>
            </dl>
          )
        }
      />
    </>
  )
}
