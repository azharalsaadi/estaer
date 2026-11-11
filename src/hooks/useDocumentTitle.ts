import { useEffect } from "react"
import { useTranslation } from "react-i18next"

export const useDocumentTitle = (title: string) => {
  const { t } = useTranslation()

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${title} · ${t("common.appName")}`
    return () => {
      document.title = previousTitle
    }
  }, [title, t])
}
