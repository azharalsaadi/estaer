import { zodResolver } from "@hookform/resolvers/zod"
import { ImageOff } from "lucide-react"
import { useMemo, useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { APIError } from "@/types/api.types"
import { getItemImageUrl } from "../apis/items.api"
import { ITEM_IMAGE_ALLOWED_TYPES, ITEM_IMAGE_MAX_SIZE_BYTES } from "../catalog.constants"
import { createItemSchema, type ItemFormData } from "../catalog.schema"
import type { Category, ItemRow } from "../catalog.types"
import { useAllCategories } from "../hooks/useAllCategories"
import { useCreateItem } from "../hooks/useCreateItem"
import { useUpdateItem } from "../hooks/useUpdateItem"
import { useUploadItemImage } from "../hooks/useUploadItemImage"
import { hasValidImageSignature } from "../lib/imageSignature"

type ItemDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** undefined = create mode */
  item?: ItemRow
}

export function ItemDialog({ open, onOpenChange, item }: ItemDialogProps) {
  const { t } = useTranslation()
  const [serverErrorCode, setServerErrorCode] = useState<APIError["code"] | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageClientError, setImageClientError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingValues, setPendingValues] = useState<ItemFormData | null>(null)
  const isEditMode = !!item

  const categoriesQuery = useAllCategories()
  const categories: Category[] = categoriesQuery.data ?? []
  const validCategoryIds = useMemo(
    () => (categoriesQuery.data ?? []).map((category) => category.id),
    [categoriesQuery.data]
  )
  const schema = useMemo(() => createItemSchema(validCategoryIds), [validCategoryIds])

  const createItem = useCreateItem()
  const updateItem = useUpdateItem()
  const uploadImage = useUploadItemImage()
  const isPending = createItem.isPending || updateItem.isPending || uploadImage.isPending

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(schema),
    // No reset-on-open effect needed: the page that renders this dialog
    // gives it a `key` tied to the open/edit target, so a fresh mount
    // (and fresh defaultValues) happens every time it opens.
    defaultValues: {
      name: item?.name ?? "",
      category_id: item?.category_id ?? "",
      serial_number: item?.serial_number ?? "",
      active: item?.active ?? true,
    },
  })

  // Compared against (not a plain boolean) so selecting a different file,
  // or the saved image changing, is tried fresh instead of staying stuck
  // on the "missing" icon after one failed load.
  const [failedPreviewUrl, setFailedPreviewUrl] = useState<string | null>(null)

  const previewUrl = useMemo(() => {
    if (imageFile) return URL.createObjectURL(imageFile)
    return getItemImageUrl(item?.image_path ?? null)
  }, [imageFile, item?.image_path])

  const onImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setImageFile(null)
      setImageClientError(null)
      return
    }
    if (
      !ITEM_IMAGE_ALLOWED_TYPES.includes(
        file.type as (typeof ITEM_IMAGE_ALLOWED_TYPES)[number]
      )
    ) {
      setImageClientError(t("validation.imageInvalidType"))
      event.target.value = ""
      return
    }
    if (file.size > ITEM_IMAGE_MAX_SIZE_BYTES) {
      setImageClientError(t("validation.imageTooLarge"))
      event.target.value = ""
      return
    }
    // `file.type` (checked above) is the browser's guess from the file's
    // NAME, not its content — a text file renamed to end in ".png" still
    // reports "image/png" there. Checking the actual magic bytes catches
    // that case before it ever reaches Storage.
    if (!(await hasValidImageSignature(file))) {
      setImageClientError(t("validation.imageInvalidContent"))
      event.target.value = ""
      return
    }
    setImageClientError(null)
    setImageFile(file)
  }

  const savedMessage = isEditMode
    ? t("adminCatalog.equipmentSaved")
    : t("adminCatalog.equipmentAdded")

  // Only Add goes through a confirmation step (see onSubmit below) —
  // editing saves directly, exactly as before.
  const performSave = (values: ItemFormData) => {
    setServerErrorCode(null)

    const afterSaved = (savedItem: ItemRow) => {
      if (!imageFile) {
        toast.success(savedMessage)
        setConfirmOpen(false)
        onOpenChange(false)
        return
      }
      uploadImage.mutate(
        {
          itemId: savedItem.id,
          file: imageFile,
          previousImagePath: item?.image_path ?? null,
        },
        {
          onSuccess: () => {
            toast.success(savedMessage)
            setConfirmOpen(false)
            onOpenChange(false)
          },
          onError: () => {
            toast.error(t("adminCatalog.imageUploadFailed"))
            setConfirmOpen(false)
          },
        }
      )
    }
    const onError = (error: APIError) => {
      setServerErrorCode(error.code)
      setConfirmOpen(false)
    }

    if (isEditMode) {
      updateItem.mutate({ id: item.id, ...values }, { onSuccess: afterSaved, onError })
    } else {
      createItem.mutate(values, { onSuccess: afterSaved, onError })
    }
  }

  const onSubmit = handleSubmit((values) => {
    setServerErrorCode(null)
    if (isEditMode) {
      performSave(values)
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
                ? t("adminCatalog.editEquipment")
                : t("adminCatalog.addEquipment")}
            </DialogTitle>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => void onSubmit(event)}
            noValidate
          >
            <div>
              <Label htmlFor="item-name">{t("fields.itemName")}</Label>
              <Input
                id="item-name"
                className="mt-1.5"
                placeholder={t("fields.itemNamePlaceholder")}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-destructive mt-1.5 text-xs">
                  {t(errors.name.message ?? "")}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="item-serial">{t("fields.serialNumber")}</Label>
              <Input
                id="item-serial"
                dir="ltr"
                className="mt-1.5"
                placeholder={t("fields.serialNumberPlaceholder")}
                {...register("serial_number")}
              />
              {errors.serial_number && (
                <p className="text-destructive mt-1.5 text-xs">
                  {t(errors.serial_number.message ?? "")}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="item-category">{t("fields.category")}</Label>
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="item-category" className="mt-1.5 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category_id && (
                <p className="text-destructive mt-1.5 text-xs">
                  {t(errors.category_id.message ?? "")}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="item-visibility">{t("fields.visibility")}</Label>
              <Controller
                control={control}
                name="active"
                render={({ field }) => (
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <Switch
                      id="item-visibility"
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
                {t("adminCatalog.equipmentVisibilityHelp")}
              </p>
            </div>

            <div>
              <Label htmlFor="item-image">{t("fields.image")}</Label>
              <div className="mt-1.5 flex items-center gap-3">
                <div className="border-border bg-muted flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
                  {previewUrl && previewUrl !== failedPreviewUrl ? (
                    <img
                      src={previewUrl}
                      alt=""
                      className="size-full object-cover"
                      onError={() => setFailedPreviewUrl(previewUrl)}
                    />
                  ) : (
                    <ImageOff
                      className="text-muted-foreground size-5"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <Input
                  id="item-image"
                  type="file"
                  accept={ITEM_IMAGE_ALLOWED_TYPES.join(",")}
                  onChange={(event) => void onImageChange(event)}
                  className="flex-1"
                />
              </div>
              {imageClientError && (
                <p className="text-destructive mt-1.5 text-xs">{imageClientError}</p>
              )}
              <p className="text-muted-foreground mt-1.5 text-xs">
                {t("adminCatalog.imageHelp")}
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
        title={t("adminCatalog.confirmAddEquipment")}
        isPending={isPending}
        onConfirm={() => pendingValues && performSave(pendingValues)}
      />
    </>
  )
}
