import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useActiveCategories } from "../hooks/useActiveCategories"
import { useActiveItems } from "../hooks/useActiveItems"
import { StatePanel } from "@/components/shared/StatePanel"
import { EquipmentCard } from "./EquipmentCard"
import type { Item } from "../catalog.types"

const ALL_CATEGORIES_VALUE = "all"

type CatalogBrowseViewProps = {
  category: string | undefined
  onCategoryChange: (categoryId: string | undefined) => void
  /**
   * Render-prop injection point for the "Request equipment" action. Kept
   * out of this component (and out of the catalog feature entirely) so
   * catalog stays free of borrowing logic — the page composing this view
   * supplies it, since a page may depend on both features.
   */
  renderCardFooter?: (item: Item) => ReactNode
}

/**
 * Active equipment in active categories — used by both the Member
 * catalog page and the Admin "Borrow equipment" page (admins retain
 * member abilities). RLS already restricts what either role can see;
 * useActiveItems() additionally only ever queries the active subset, so
 * an admin browsing here sees the same thing a member would, not the
 * full management view.
 */
export function CatalogBrowseView({
  category,
  onCategoryChange,
  renderCardFooter,
}: CatalogBrowseViewProps) {
  const { t } = useTranslation()
  const categoriesQuery = useActiveCategories()
  const itemsQuery = useActiveItems()

  const items = (itemsQuery.data ?? []).filter(
    (item) => !category || item.category_id === category
  )

  return (
    <div className="space-y-6">
      <div className="flex w-full max-w-[220px] justify-end">
        <Select
          value={category ?? ALL_CATEGORIES_VALUE}
          onValueChange={(value) =>
            onCategoryChange(value === ALL_CATEGORIES_VALUE ? undefined : value)
          }
        >
          <SelectTrigger aria-label={t("catalog.filterByCategory")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES_VALUE}>
              {t("catalog.allCategories")}
            </SelectItem>
            {(categoriesQuery.data ?? []).map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {itemsQuery.isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[280px] rounded-[17px]" />
          ))}
        </div>
      ) : itemsQuery.isError ? (
        <StatePanel
          variant="error"
          title={t("catalog.loadErrorTitle")}
          onRetry={() => void itemsQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <StatePanel
          variant="empty"
          title={t("catalog.emptyTitle")}
          body={t("catalog.emptyBody")}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <EquipmentCard key={item.id} item={item} footer={renderCardFooter?.(item)} />
          ))}
        </div>
      )}
    </div>
  )
}
