import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { LoginForm } from "../components/LoginForm"
import { resolvePostLoginDestination } from "../lib/safeRedirect"
import { adminLoginRoute } from "./admin-login.route"

export default function AdminLoginPage() {
  const { t } = useTranslation()
  const { redirect } = adminLoginRoute.useSearch()
  const navigate = useNavigate()
  useDocumentTitle(t("titles.adminLogin"))

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-10 sm:px-8">
      <img
        src="/assets/estaer-logo.png"
        alt={t("common.appName")}
        className="h-[50px] w-[150px] object-contain"
      />
      <LoginForm
        eyebrow={t("auth.adminEyebrow")}
        onVerified={(user) => {
          // Visiting the admin login URL never grants the admin role —
          // a non-admin who verifies here still lands on their own role
          // home (/member), never inside /admin.
          void navigate({ to: resolvePostLoginDestination(redirect, user.role) })
        }}
      />
    </div>
  )
}
