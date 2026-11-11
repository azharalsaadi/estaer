import { Link } from "@tanstack/react-router"
import { Menu, User } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { LanguageToggleButton } from "./LanguageToggleButton"
import { LogoutButton } from "./LogoutButton"
import { MEMBER_NAV_ITEMS } from "./navConfig"

function SessionAction({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { t } = useTranslation()
  return isAuthenticated ? (
    <LogoutButton to="/member" />
  ) : (
    <Button asChild size="sm">
      <Link to="/login">{t("common.signIn")}</Link>
    </Button>
  )
}

type MemberShellProps = {
  children: ReactNode
}

export function MemberShell({ children }: MemberShellProps) {
  const { t } = useTranslation()
  const { user } = useAuth()

  return (
    <div className="bg-background min-h-svh">
      <header className="border-border bg-card relative z-10 border-b">
        <div className="mx-auto flex max-w-[1280px] items-center gap-10 px-5 py-5 sm:px-8">
          <Link to="/member" aria-label={t("common.appName")} className="shrink-0">
            <img
              src="/assets/estaer-logo.png"
              alt={t("common.appName")}
              className="h-[47px] w-[140px] object-contain sm:h-[57px] sm:w-[170px]"
            />
          </Link>

          <nav className="text-muted-foreground hidden flex-1 items-center gap-7 text-sm sm:flex">
            {MEMBER_NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="hover:text-foreground transition-colors"
                activeProps={{ className: "font-semibold text-primary" }}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-2">
            <LanguageToggleButton />
            {user && (
              <>
                <span className="text-muted-foreground hidden text-xs md:inline">
                  {user.email}
                </span>
                <span
                  className="bg-muted text-primary hidden rounded-full p-3 sm:inline-flex"
                  title={user.email}
                >
                  <User className="size-4" aria-hidden="true" />
                </span>
              </>
            )}
            <div className="hidden sm:block">
              <SessionAction isAuthenticated={!!user} />
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden"
                  aria-label={t("topbar.openNavigation")}
                >
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <nav className="mt-10 flex flex-col gap-1 px-2">
                  {MEMBER_NAV_ITEMS.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="text-muted-foreground hover:bg-muted rounded-lg px-3 py-3 text-sm transition-colors"
                      activeProps={{ className: "bg-muted font-semibold text-primary" }}
                    >
                      {t(item.labelKey)}
                    </Link>
                  ))}
                  <div className="border-border mt-4 border-t pt-4">
                    <SessionAction isAuthenticated={!!user} />
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-5 py-8 sm:px-8">{children}</main>
    </div>
  )
}
