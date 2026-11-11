import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { StatePanel } from "@/components/shared/StatePanel"
import { CatalogTabs } from "../components/CatalogTabs"
import { ItemDialog } from "../components/ItemDialog"
import { useAllItems } from "../hooks/useAllItems"
import { adminCatalogRoute } from "./admin-catalog.route"

const ALL_VISIBILITY_VALUE = "all"

export default function AdminCatalogPage() {
  const { t } = useTranslation()
  useDocumentTitle(t("nav.adminCatalog"))

  const { dialog, itemId, q, visibility } = adminCatalogRoute.useSearch()
  const navigate = useNavigate()
  const itemsQuery = useAllItems()

  const items = (itemsQuery.data ?? []).filter((item) => {
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q.toLowerCase()) ||
      item.serial_number.toLowerCase().includes(q.toLowerCase())
    const matchesVisibility =
      !visibility || (visibility === "active" ? item.active : !item.active)
    return matchesSearch && matchesVisibility
  })

  const editingItem = itemId ? items.find((item) => item.id === itemId) : undefined

  const openCreateDialog = () => {
    void navigate({
      to: "/admin/catalog",
      search: (prev) => ({ ...prev, dialog: "create", itemId: undefined }),
      replace: true,
    })
  }

  const openEditDialog = (id: string) => {
    void navigate({
      to: "/admin/catalog",
      search: (prev) => ({ ...prev, dialog: "edit", itemId: id }),
      replace: true,
    })
  }

  const closeDialog = () => {
    void navigate({
      to: "/admin/catalog",
      search: (prev) => ({ ...prev, dialog: undefined, itemId: undefined }),
      replace: true,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-foreground text-2xl font-semibold">
          {t("nav.adminCatalog")}
        </h1>
        <Button type="button" onClick={openCreateDialog}>
          {t("adminCatalog.addEquipment")}
        </Button>
      </div>

      <CatalogTabs />

      <div className="flex flex-wrap gap-3">
        <Input
          value={q ?? ""}
          onChange={(event) =>
            void navigate({
              to: "/admin/catalog",
              search: (prev) => ({ ...prev, q: event.target.value || undefined }),
              replace: true,
            })
          }
          placeholder={t("adminCatalog.searchPlaceholder")}
          className="max-w-xs"
        />
        <Select
          value={visibility ?? ALL_VISIBILITY_VALUE}
          onValueChange={(value) =>
            void navigate({
              to: "/admin/catalog",
              search: (prev) => ({
                ...prev,
                visibility:
                  value === ALL_VISIBILITY_VALUE
                    ? undefined
                    : (value as "active" | "inactive"),
              }),
              replace: true,
            })
          }
        >
          <SelectTrigger aria-label={t("fields.visibility")} className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VISIBILITY_VALUE}>
              {t("catalog.allCategories")}
            </SelectItem>
            <SelectItem value="active">{t("catalog.active")}</SelectItem>
            <SelectItem value="inactive">{t("catalog.inactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {itemsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : itemsQuery.isError ? (
        <StatePanel
          variant="error"
          title={t("adminCatalog.loadErrorTitle")}
          onRetry={() => void itemsQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <StatePanel
          variant="empty"
          title={t("adminCatalog.noEquipmentFound")}
          body={t("adminCatalog.noEquipmentFoundBody")}
        />
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("adminCatalog.tableName")}</TableHead>
                <TableHead>{t("adminCatalog.tableSerial")}</TableHead>
                <TableHead>{t("adminCatalog.tableCategory")}</TableHead>
                <TableHead>{t("fields.visibility")}</TableHead>
                <TableHead className="text-end" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell dir="ltr" className="text-muted-foreground text-start">
                    {item.serial_number}
                  </TableCell>
                  <TableCell>{item.category.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        item.active ? "border-success/30 text-success-foreground" : ""
                      }
                    >
                      {item.active ? t("catalog.active") : t("catalog.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => openEditDialog(item.id)}
                    >
                      {t("common.edit")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ItemDialog
        // The "ready"/"loading" suffix forces a remount once useAllItems()
        // resolves: on a direct edit-URL load (refresh, bookmark, shared
        // link), this dialog mounts before that query has data, so
        // `editingItem` is briefly undefined. react-hook-form only reads
        // `defaultValues` at mount — without this, the dialog would stay
        // permanently blank even after the real item loads a moment later.
        key={`${dialog ?? "closed"}-${itemId ?? "new"}-${
          itemsQuery.isSuccess ? "ready" : "loading"
        }`}
        open={dialog === "create" || dialog === "edit"}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
        item={dialog === "edit" ? editingItem : undefined}
      />
    </div>
  )
}
