import { Link } from "@tanstack/react-router"
import { ArrowUpRight, Check } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

export function MemberHero() {
  const { t } = useTranslation()

  return (
    <section
      className="relative grid gap-5 overflow-hidden rounded-[27px] border border-[#e7e7e7] bg-[#f1f1f1] px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:px-12"
      style={{
        backgroundImage: "url('/assets/equipment-pattern.svg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div>
        <span className="text-primary text-xs font-bold tracking-[2px] uppercase">
          {t("home.eyebrow")}
        </span>
        <h1 className="text-foreground mt-4 max-w-xl text-[40px] leading-[1.1] font-bold tracking-tight lg:text-[57px]">
          {t("home.headingLine1")}
          <br />
          <em className="text-primary not-italic">{t("home.headingLine2")}</em>
        </h1>
        <p className="text-muted-foreground mt-5 max-w-sm text-sm leading-7">
          {t("home.body")}
        </p>
        <Button asChild className="mt-6">
          <Link to="/member/catalog">
            {t("home.exploreEquipment")}
            <ArrowUpRight className="rtl:scale-x-[-1]" />
          </Link>
        </Button>
      </div>

      <div className="relative hidden h-[220px] lg:block" aria-hidden="true">
        <div className="absolute start-6 top-0 w-[200px] rotate-[-9deg] rounded-[25px] border border-white bg-white/85 p-2 pb-3 shadow-lg shadow-[#5656560d]">
          <img
            src="/assets/cameras.svg"
            alt=""
            className="h-[150px] w-full object-contain"
          />
        </div>
        <div className="absolute start-[180px] top-[70px] w-[195px] rotate-[8deg] rounded-[25px] border border-[#f1f1f1] bg-[#dedede] p-2 pb-3 shadow-lg shadow-[#5656560d]">
          <img
            src="/assets/laptops.svg"
            alt=""
            className="h-[140px] w-full object-contain"
          />
        </div>
        <span className="text-primary absolute end-1 top-4 rounded-full bg-white px-4 py-3 text-[11px] font-medium shadow-md">
          <Check className="me-1 inline size-3" aria-hidden="true" />
          {t("home.sharedByYourTeam")}
        </span>
      </div>
    </section>
  )
}
