import { Languages } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useLanguageToggle } from "@/hooks/useLanguageToggle"

export function LanguageToggleButton() {
  const { t } = useTranslation()
  const { toggleLanguage } = useLanguageToggle()

  return (
    <Button variant="ghost" size="sm" onClick={toggleLanguage} type="button">
      <Languages className="size-4" aria-hidden="true" />
      {t("common.languageToggle")}
    </Button>
  )
}
