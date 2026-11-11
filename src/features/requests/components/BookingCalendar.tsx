import type { ComponentProps } from "react"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import type { BookedRange } from "../lib/bookingOverlap"
import { isDateBooked } from "../lib/bookingOverlap"
import { isoToLocalDate, localDateToIso } from "../lib/dates"

type BookingCalendarProps = {
  value: string
  onChange: (value: string) => void
  bookedRanges: BookedRange[]
  /**
   * Full control over which days are pickable — deliberately NOT just
   * "is this day itself booked," because that's the wrong rule for the
   * End Date picker: choosing Nov 10 as the end of a Nov 5 start is
   * invalid if Nov 9 is booked, even though Nov 10 itself isn't. The
   * Start Date picker's caller passes a simpler "is this day booked"
   * check; the End Date picker's caller passes "would [start, this day]
   * cross a booking."
   */
  disabled: (date: Date) => boolean
}

/**
 * Highlights every booked day using the app's existing soft-teal token
 * (`--muted: #f1f1f1`), not a new color, with a "Booked" legend (see
 * RequestEquipmentFormDialog).
 *
 * `rounded-full` is unconditional (every day, not just booked ones):
 * without it, adjacent day buttons touch edge-to-edge with no
 * border-radius of their own (the base CalendarDayButton only rounds
 * conditionally, for RDP's native multi-day range-selection mode, which
 * this never uses — mode is always "single"). `rounded-full` makes
 * every highlight — booked or selected — its own distinct circle.
 *
 * The visual gap between two adjacent highlighted circles comes from
 * CalendarDayButton's own `shadow-[inset_0_0_0_1px_var(--background)]`
 * (a 1px inset ring painted in the page background color on every day
 * button), not from a margin here — a margin would shrink the actual
 * button and its click target, not just the highlight.
 */
function BookedDayButton(props: ComponentProps<typeof CalendarDayButton>) {
  const isBooked = props.modifiers.booked === true
  return (
    <CalendarDayButton
      {...props}
      className={cn("rounded-full", isBooked && "bg-muted", props.className)}
    />
  )
}

export function BookingCalendar({
  value,
  onChange,
  bookedRanges,
  disabled,
}: BookingCalendarProps) {
  return (
    <Calendar
      mode="single"
      selected={value ? isoToLocalDate(value) : undefined}
      onSelect={(date) => {
        if (date) onChange(localDateToIso(date))
      }}
      disabled={disabled}
      modifiers={{
        booked: (date) => isDateBooked(localDateToIso(date), bookedRanges),
      }}
      components={{ DayButton: BookedDayButton }}
      className="w-fit"
    />
  )
}
