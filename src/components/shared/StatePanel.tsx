import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type StatePanelProps = {
  variant: "empty" | "error"
  title: string
  body?: string
  onRetry?: () => void
}

/** Shared empty/error panel for data-driven screens — used by the
 * catalog and requests features (promoted here once a second feature
 * needed the identical pattern; see docs/STRUCTURE.md). */
export function StatePanel({ variant, title, body, onRetry }: StatePanelProps) {
  const { t } = useTranslation()

  return (
    <div className="border-border bg-card rounded-[18px] border border-dashed px-8 py-16 text-center">
      {variant === "error" && (
        <Badge variant="outline" className="border-destructive/30 text-destructive">
          {t("serverErrors.default")}
        </Badge>
      )}
      <h2 className="text-foreground mt-4 text-xl font-semibold">{title}</h2>
      {body && (
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">{body}</p>
      )}
      {variant === "error" && onRetry && (
        <Button variant="secondary" className="mt-5" onClick={onRetry} type="button">
          {t("common.retry")}
        </Button>
      )}
    </div>
  )
}
