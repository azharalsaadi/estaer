import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import type { Item } from "@/features/catalog/catalog.types"
import { useItemsAvailability } from "../hooks/useItemsAvailability"
import { RequestEquipmentFormDialog } from "./RequestEquipmentFormDialog"

type RequestEquipmentActionProps = {
  item: Item
}

/**
 * The "Request equipment" footer injected into EquipmentCard via
 * CatalogBrowseView's render-prop (see member-catalog.page.tsx /
 * admin-borrow.page.tsx) — lives in the requests feature, not catalog,
 * since it's borrowing logic. Shared identically by both portals:
 * admins retain member borrowing abilities and use the exact same
 * request-creation rules, so there is no admin/member variant here —
 * just the one RequestEquipmentFormDialog.
 */
export function RequestEquipmentAction({ item }: RequestEquipmentActionProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const availabilityQuery = useItemsAvailability([item.id])
  // "Available" here means "not booked for TODAY specifically" — not
  // "has no bookings at all" (see get_item_availability,
  // 0012_date_range_overlap.sql). An item booked Nov 9–11 is bookable
  // again starting Nov 12, so the button stays enabled either way; only
  // its label and the status line above it change. The actual
  // date-range conflict check happens server-side when the form is
  // submitted (RequestEquipmentFormDialog), regardless of which label
  // is showing here.
  const isAvailableToday = availabilityQuery.data?.get(item.id) ?? false

  if (availabilityQuery.isLoading) {
    return (
      <p className="text-muted-foreground text-xs">{t("catalog.checkingAvailability")}</p>
    )
  }

  return (
    <>
      {!isAvailableToday && (
        <p className="text-muted-foreground mb-1.5 text-xs">
          {t("catalog.reservedOrOnLoan")}
        </p>
      )}
      <Button size="sm" className="w-full" onClick={() => setOpen(true)} type="button">
        {isAvailableToday ? t("catalog.requestEquipment") : t("catalog.bookAnotherDate")}
      </Button>
      <RequestEquipmentFormDialog
        open={open}
        onOpenChange={setOpen}
        itemId={item.id}
        itemName={item.name}
      />
    </>
  )
}
