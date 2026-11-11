import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { BookingCalendar } from "./BookingCalendar"
import type { BookedRange } from "../lib/bookingOverlap"

type DateFieldPopoverProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  bookedRanges: BookedRange[]
  disabled: (date: Date) => boolean
  placeholder: string
  /** Controlled from the parent dialog so only one of the two date
   * fields can have its calendar open at a time. */
  open: boolean
  onOpenChange: (open: boolean) => void
  "aria-invalid"?: boolean
}

/**
 * A date field that looks like a normal text input (selected date or a
 * placeholder, plus a calendar icon) and opens BookingCalendar in a
 * popover on click — closed by default, and closes itself again the
 * moment a date is picked. Radix's Popover handles viewport collision
 * avoidance on its own, so the calendar repositions rather than
 * clipping or causing horizontal scroll near an edge.
 */
export function DateFieldPopover({
  id,
  value,
  onChange,
  bookedRanges,
  disabled,
  placeholder,
  open,
  onOpenChange,
  "aria-invalid": ariaInvalid,
}: DateFieldPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          aria-invalid={ariaInvalid}
          className={cn(
            "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:ring-3 aria-invalid:ring-3 md:text-sm"
          )}
        >
          <span dir="ltr" className={value ? "text-foreground" : "text-muted-foreground"}>
            {value || placeholder}
          </span>
          <CalendarIcon
            className="text-muted-foreground size-4 shrink-0"
            aria-hidden="true"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <BookingCalendar
          value={value}
          onChange={(nextValue) => {
            onChange(nextValue)
            onOpenChange(false)
          }}
          bookedRanges={bookedRanges}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  )
}
