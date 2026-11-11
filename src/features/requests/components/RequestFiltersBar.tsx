import { useTranslation } from "react-i18next"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useActiveCategories } from "@/features/catalog/hooks/useActiveCategories"
import { REQUEST_STATUS_LABEL_KEYS, REQUEST_STATUS_OPTIONS } from "../requests.constants"
import type { RequestStatus } from "../requests.types"

const ALL_VALUE = "all"

type RequestFiltersBarProps = {
  status: RequestStatus | undefined
  categoryId: string | undefined
  onStatusChange: (status: RequestStatus | undefined) => void
  onCategoryChange: (categoryId: string | undefined) => void
}

/** Status + category filters, kept in the URL by the page that renders
 * this (see each requests route's validateSearch). */
export function RequestFiltersBar({
  status,
  categoryId,
  onStatusChange,
  onCategoryChange,
}: RequestFiltersBarProps) {
  const { t } = useTranslation()
  const categoriesQuery = useActiveCategories()

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={status ?? ALL_VALUE}
        onValueChange={(value) =>
          onStatusChange(value === ALL_VALUE ? undefined : (value as RequestStatus))
        }
      >
        <SelectTrigger aria-label={t("requests.filterByStatus")} className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{t("requests.allStatuses")}</SelectItem>
          {REQUEST_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {t(REQUEST_STATUS_LABEL_KEYS[option])}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={categoryId ?? ALL_VALUE}
        onValueChange={(value) =>
          onCategoryChange(value === ALL_VALUE ? undefined : value)
        }
      >
        <SelectTrigger aria-label={t("requests.filterByCategory")} className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{t("requests.allCategories")}</SelectItem>
          {(categoriesQuery.data ?? []).map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
