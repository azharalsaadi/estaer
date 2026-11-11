import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-primary text-sm font-semibold tracking-[2px] uppercase">
        404
      </span>
      <h1 className="text-foreground text-2xl font-semibold">{t("common.appName")}</h1>
      <Button asChild>
        <Link to="/member">{t("nav.memberHome")}</Link>
      </Button>
    </div>
  )
}
