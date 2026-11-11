import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { useCreateRequest } from "./useCreateRequest"
import { useItemBookedRanges } from "./useItemBookedRanges"
import { businessToday, getReturnDueDate } from "../lib/dates"
import { createRequestSchema, type RequestFormData } from "../requests.schema"

/**
 * All the non-visual logic shared by the admin and member "request
 * equipment" dialogs — validation, the booked-ranges query, the
 * confirm-before-submit step, and the actual mutation — so the two
 * presentational components (RequestEquipmentDialog for admin,
 * MemberRequestEquipmentDialog for the redesigned member view) can
 * differ only in layout, never in behavior.
 */
export function useRequestEquipmentForm(itemId: string, onOpenChange: (open: boolean) => void) {
  const { t } = useTranslation()
  const today = businessToday()
  const bookedRangesQuery = useItemBookedRanges(itemId)
  const bookedRanges = useMemo(
    () => bookedRangesQuery.data ?? [],
    [bookedRangesQuery.data]
  )
  const schema = useMemo(
    () => createRequestSchema(today, bookedRanges),
    [today, bookedRanges]
  )
  const createRequest = useCreateRequest()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingValues, setPendingValues] = useState<RequestFormData | null>(null)

  const form = useForm<RequestFormData>({
    resolver: zodResolver(schema),
    defaultValues: { start_date: today, end_date: today, reason: "" },
  })

  const startDate = form.watch("start_date")
  const endDate = form.watch("end_date")
  const returnDue = endDate && endDate >= today ? getReturnDueDate(endDate) : null
  const confirmReturnDue = pendingValues ? getReturnDueDate(pendingValues.end_date) : null

  // Validate first (handleSubmit's zod resolver), then — if valid — open
  // the confirmation step instead of submitting directly. The form
  // dialog underneath stays open and untouched, so Cancel on the
  // confirmation naturally leaves every input exactly as the member
  // left it.
  const onSubmit = form.handleSubmit((values) => {
    setPendingValues(values)
    setConfirmOpen(true)
  })

  const onConfirmSubmit = () => {
    if (!pendingValues) return
    createRequest.mutate(
      { item_id: itemId, ...pendingValues },
      {
        onSuccess: () => {
          toast.success(t("requests.requestSubmitted"))
          setConfirmOpen(false)
          onOpenChange(false)
        },
        onError: () => {
          // Close the confirmation and land back on the form, which
          // already shows the inline error below and keeps every
          // input (createRequest.error is read there, unchanged).
          setConfirmOpen(false)
        },
      }
    )
  }

  return {
    t,
    today,
    bookedRangesQuery,
    bookedRanges,
    form,
    startDate,
    endDate,
    returnDue,
    onSubmit,
    createRequest,
    confirmOpen,
    setConfirmOpen,
    pendingValues,
    confirmReturnDue,
    onConfirmSubmit,
  }
}
