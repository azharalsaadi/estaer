import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

export function FullPageSpinner() {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      className="text-muted-foreground flex min-h-svh items-center justify-center gap-3"
    >
      <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      <span>{t("common.loading")}</span>
    </div>
  )
}
