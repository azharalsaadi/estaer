import { useEffect } from "react"
import { useTranslation } from "react-i18next"

export const useLanguageToggle = () => {
  const { i18n } = useTranslation()
  const isArabic = i18n.language.startsWith("ar")
  const language = isArabic ? "ar" : "en"

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = isArabic ? "rtl" : "ltr"
  }, [language, isArabic])

  const toggleLanguage = () => {
    void i18n.changeLanguage(isArabic ? "en" : "ar")
  }

  return { language, isArabic, toggleLanguage }
}
