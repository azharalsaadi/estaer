import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"

type ComingSoonPanelProps = {
  title: string
  body: string
}

/**
 * Placeholder for screens whose real data and actions are not built yet.
 * Used by 2+ features (catalog, requests) so it lives in components/shared.
 * Never render fabricated data here — only this explicit "coming soon" state.
 */
export function ComingSoonPanel({ title, body }: ComingSoonPanelProps) {
  const { t } = useTranslation()

  return (
    <div className="border-border bg-card rounded-[18px] border border-dashed px-8 py-16 text-center">
      <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
        {t("common.comingSoonBadge")}
      </Badge>
      <h2 className="text-foreground mt-4 text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">{body}</p>
    </div>
  )
}
