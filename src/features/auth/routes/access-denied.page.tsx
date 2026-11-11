import { useTranslation } from "react-i18next"
import { AccessDeniedPage as AccessDeniedView } from "@/components/shared/AccessDeniedPage"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"

export default function AccessDeniedPage() {
  const { t } = useTranslation()
  useDocumentTitle(t("accessDenied.title"))

  return <AccessDeniedView />
}
