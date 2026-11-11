import LanguageDetector from "i18next-browser-languagedetector"
import i18next from "i18next"
import { initReactI18next } from "react-i18next"
import ar from "./locales/ar.json"
import en from "./locales/en.json"

void i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "ar"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  })

export default i18next
