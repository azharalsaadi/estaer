import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { LanguageToggleButton } from "@/components/layout/LanguageToggleButton"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { LoginForm } from "../components/LoginForm"
import { resolvePostLoginDestination } from "../lib/safeRedirect"
import { memberLoginRoute } from "./member-login.route"

export default function MemberLoginPage() {
  const { t } = useTranslation()
  const { redirect } = memberLoginRoute.useSearch()
  const navigate = useNavigate()
  useDocumentTitle(t("titles.login"))

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-10 sm:px-8">
      <div className="flex items-center justify-between">
        <img
          src="/assets/estaer-logo.png"
          alt={t("common.appName")}
          className="h-[57px] w-[170px] object-contain"
        />
        <LanguageToggleButton />
      </div>
      <LoginForm
        eyebrow={t("auth.memberEyebrow")}
        onVerified={(user) => {
          void navigate({ to: resolvePostLoginDestination(redirect, user.role) })
        }}
      />
    </div>
  )
}
