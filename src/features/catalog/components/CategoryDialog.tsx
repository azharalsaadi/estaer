import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { ConfirmActionDialog } from "@/components/shared/ConfirmActionDialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { APIError } from "@/types/api.types"
import { categorySchema, type CategoryFormData } from "../catalog.schema"
import type { Category } from "../catalog.types"
import { useCreateCategory } from "../hooks/useCreateCategory"
import { useUpdateCategory } from "../hooks/useUpdateCategory"

type CategoryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** undefined = create mode */
  category?: Category
}

export function CategoryDialog({ open, onOpenChange, category }: CategoryDialogProps) {
  const { t } = useTranslation()
  const [serverErrorCode, setServerErrorCode] = useState<APIError["code"] | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingValues, setPendingValues] = useState<CategoryFormData | null>(null)
  const isEditMode = !!category

  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const isPending = createCategory.isPending || updateCategory.isPending

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    // No reset-on-open effect needed: the page that renders this dialog
    // gives it a `key` tied to the open/edit target, so a fresh mount
    // (and fresh defaultValues) happens every time it opens.
    defaultValues: { name: category?.name ?? "", active: category?.active ?? true },
  })

  // Only Add goes through a confirmation step — editing saves directly,
  // exactly as before.
  const saveCategory = (values: CategoryFormData) => {
    setServerErrorCode(null)
    const onSuccess = () => {
      toast.success(
        isEditMode ? t("adminCatalog.categorySaved") : t("adminCatalog.categoryAdded")
      )
      setConfirmOpen(false)
      onOpenChange(false)
    }
    const onError = (error: APIError) => {
      setServerErrorCode(error.code)
      setConfirmOpen(false)
    }

    if (isEditMode) {
      updateCategory.mutate({ id: category.id, ...values }, { onSuccess, onError })
    } else {
      createCategory.mutate(values, { onSuccess, onError })
    }
  }

  const onSubmit = handleSubmit((values) => {
    setServerErrorCode(null)
    if (isEditMode) {
      saveCategory(values)
      return
    }
    setPendingValues(values)
    setConfirmOpen(true)
  })

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode
                ? t("adminCatalog.editCategory")
                : t("adminCatalog.addCategory")}
            </DialogTitle>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => void onSubmit(event)}
            noValidate
          >
            <div>
              <Label htmlFor="category-name">{t("fields.categoryName")}</Label>
              <Input
                id="category-name"
                className="mt-1.5"
                placeholder={t("fields.categoryNamePlaceholder")}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-destructive mt-1.5 text-xs">
                  {t(errors.name.message ?? "")}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="category-visibility">{t("fields.visibility")}</Label>
              <Controller
                control={control}
                name="active"
                render={({ field }) => (
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <Switch
                      id="category-visibility"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <span className="text-foreground text-sm font-medium">
                      {field.value ? t("catalog.active") : t("catalog.inactive")}
                    </span>
                  </div>
                )}
              />
              <p className="text-muted-foreground mt-1.5 text-xs">
                {t("adminCatalog.categoryVisibilityHelp")}
              </p>
            </div>

            {serverErrorCode && (
              <p className="text-destructive text-xs" role="alert">
                {t(`serverErrors.${serverErrorCode}`, {
                  defaultValue: t("serverErrors.default"),
                })}
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
              <Button type="submit" disabled={isPending}>
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("adminCatalog.confirmAddCategory")}
        isPending={isPending}
        onConfirm={() => pendingValues && saveCategory(pendingValues)}
      />
    </>
  )
}
