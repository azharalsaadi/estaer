import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

/**
 * Where a signed-in member lands after their own beforeLoad guard
 * (router/protected.routes.tsx) blocks them from an admin-only route.
 * Visiting an admin URL never grants the admin role — this is the
 * explicit, visible outcome of that check, not a silent bounce.
 */
export function AccessDeniedPage() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <Badge variant="outline" className="border-destructive/30 text-destructive">
        {t("accessDenied.badge")}
      </Badge>
      <h1 className="text-foreground text-2xl font-semibold">
        {t("accessDenied.title")}
      </h1>
      <p className="text-muted-foreground max-w-md text-sm">{t("accessDenied.body")}</p>
      <Button asChild>
        <Link to="/member">{t("auth.backToMemberHome")}</Link>
      </Button>
    </div>
  )
}
