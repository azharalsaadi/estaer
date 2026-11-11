import { useNavigate } from "@tanstack/react-router"
import { LogOut } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useSignOut } from "@/features/auth/hooks/useSignOut"

type LogoutButtonProps = {
  /** Route navigated to once sign-out completes — the admin login page
   * for the admin portal, or the public member landing page for the
   * member portal (it's no longer gated behind a session). */
  to: "/admin/login" | "/member"
}

export function LogoutButton({ to }: LogoutButtonProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const signOut = useSignOut()

  const handleSignOut = () => {
    signOut.mutate(undefined, {
      onSuccess: () => {
        void navigate({ to })
      },
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      type="button"
      onClick={handleSignOut}
      disabled={signOut.isPending}
    >
      {t("common.signOut")}
      <LogOut className="size-4" aria-hidden="true" />
    </Button>
  )
}
