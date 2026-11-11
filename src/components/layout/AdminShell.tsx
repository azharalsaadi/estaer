import { Link, useLocation } from "@tanstack/react-router"
import { Menu } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { LanguageToggleButton } from "./LanguageToggleButton"
import { LogoutButton } from "./LogoutButton"
import { ADMIN_NAV_ITEMS, isNavItemActive } from "./navConfig"

type AdminShellProps = {
  children: ReactNode
}

function AdminNavLinks() {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  return (
    <nav className="mt-4 flex flex-col gap-1">
      {ADMIN_NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = isNavItemActive(pathname, item)
        return (
          <Link
            key={item.to}
            to={item.to}
            className={
              "flex items-center gap-2.5 rounded-lg px-3.5 py-3.5 text-sm transition-colors " +
              (isActive
                ? "bg-muted text-primary font-semibold"
                : "text-muted-foreground hover:bg-muted")
            }
          >
            <Icon className="size-4" aria-hidden="true" />
            {t(item.labelKey)}
          </Link>
        )
      })}
    </nav>
  )
}

export function AdminShell({ children }: AdminShellProps) {
  const { t } = useTranslation()
  const { user } = useAuth()

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[235px_1fr]">
      <aside className="border-sidebar-border bg-sidebar sticky top-0 hidden h-svh flex-col border-e p-7 lg:flex">
        <Link to="/admin" aria-label={t("common.appName")}>
          <img
            src="/assets/estaer-logo.png"
            alt={t("common.appName")}
            className="h-[50px] w-[150px] object-contain"
          />
        </Link>
        <span className="text-muted-foreground mt-7 text-[9px] font-semibold tracking-[1.8px] uppercase">
          {t("topbar.adminWorkspaceLabel")}
        </span>
        <AdminNavLinks />
      </aside>

      <div className="min-w-0">
        <header className="border-border bg-card border-b">
          <div className="flex items-center justify-between gap-4 px-5 py-4 lg:px-9">
            <div className="flex items-center gap-3 lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("topbar.openAdminNavigation")}
                  >
                    <Menu />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <Link
                    to="/admin"
                    aria-label={t("common.appName")}
                    className="ms-2 mt-10"
                  >
                    <img
                      src="/assets/estaer-logo.png"
                      alt={t("common.appName")}
                      className="h-[42px] w-[125px] object-contain"
                    />
                  </Link>
                  <div className="px-2">
                    <AdminNavLinks />
                  </div>
                </SheetContent>
              </Sheet>
              <span className="text-muted-foreground text-xs font-semibold">
                {t("common.adminPortal")}
              </span>
            </div>

            <span className="text-muted-foreground hidden text-xs font-semibold lg:inline">
              {t("common.adminPortal")}
              {user && <span className="font-normal"> · {user.email}</span>}
            </span>

            <div className="flex items-center gap-2">
              <LanguageToggleButton />
              <LogoutButton to="/admin/login" />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1320px] px-5 py-8 lg:px-9">{children}</main>
      </div>
    </div>
  )
}
