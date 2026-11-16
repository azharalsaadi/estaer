import { Package } from "lucide-react"
import { useState, type ReactNode } from "react"
import { getItemImageUrl } from "../apis/items.api"
import { getCategoryIllustration } from "../lib/categoryIcon"
import type { Item } from "../catalog.types"

type EquipmentCardProps = {
  item: Item
  /** Slot for the Request-equipment action (added by the requests feature) — kept out of this component so catalog stays free of borrowing logic. */
  footer?: ReactNode
}

export function EquipmentCard({ item, footer }: EquipmentCardProps) {
  // Tracks the specific uploaded-image URL that failed to load (a 404, a
  // deleted storage object, a network error) — compared against, not just
  // flipped on/off, so a later re-upload (a new URL) is tried fresh rather
  // than staying stuck on the category fallback forever.
  const [failedUploadedUrl, setFailedUploadedUrl] = useState<string | null>(null)

  const uploadedImageUrl = getItemImageUrl(item.image_path)
  const showUploadedImage =
    uploadedImageUrl !== null && uploadedImageUrl !== failedUploadedUrl
  const illustration = showUploadedImage
    ? uploadedImageUrl
    : getCategoryIllustration(item.category.name)

  return (
    <article className="border-border bg-card flex h-full flex-col overflow-hidden rounded-[17px] border">
      <div className="border-border flex h-[190px] items-center justify-center border-b bg-gradient-to-br from-[#f6f6f6] to-[#efefef]">
        {illustration ? (
          <img
            key={illustration}
            src={illustration}
            alt=""
            onError={() => {
              if (uploadedImageUrl) setFailedUploadedUrl(uploadedImageUrl)
            }}
            className={
              showUploadedImage
                ? "h-full w-full object-cover"
                : "h-[170px] w-[85%] object-contain"
            }
          />
        ) : (
          <Package className="text-muted-foreground/60 size-16" aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <span className="text-primary text-[9px] font-bold tracking-[1.6px] uppercase">
          {item.category.name}
        </span>
        <h3 className="text-foreground mt-1.5 text-base font-semibold">{item.name}</h3>
        <p className="text-muted-foreground mt-1 text-xs">{item.serial_number}</p>
        {footer && <div className="mt-4">{footer}</div>}
      </div>
    </article>
  )
}
