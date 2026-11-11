import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RequestStatusBadge } from "./RequestStatusBadge"
import type { Request } from "../requests.types"

type RequestsTableProps = {
  requests: Request[]
  /**
   * "admin": All Requests — shows the borrower column, admin detail
   * route, "Review" label on pending rows.
   * "member": Member's My Requests — member detail route, no borrower
   * column.
   */
  variant: "member" | "admin"
}

export function RequestsTable({ requests, variant }: RequestsTableProps) {
  const { t } = useTranslation()
  const showBorrowerColumn = variant === "admin"
  const detailBase =
    variant === "member" ? "/member/request/$requestId" : "/admin/request/$requestId"

  return (
    <div className="border-border overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("requests.tableRequest")}</TableHead>
            {showBorrowerColumn && <TableHead>{t("requests.tableMember")}</TableHead>}
            <TableHead>{t("requests.tablePeriod")}</TableHead>
            <TableHead>{t("requests.tableStatus")}</TableHead>
            <TableHead className="text-end" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>
                <div className="text-foreground font-medium">{request.item.name}</div>
                <div className="text-muted-foreground text-xs" dir="ltr">
                  {request.item.serial_number}
                </div>
              </TableCell>
              {showBorrowerColumn && (
                <TableCell className="text-muted-foreground">
                  {request.borrower_email ?? "—"}
                </TableCell>
              )}
              <TableCell className="text-muted-foreground">
                <span dir="ltr">{request.start_date}</span>
                <br />
                <span className="text-xs">
                  {t("requests.periodTo")} <span dir="ltr">{request.end_date}</span>
                </span>
              </TableCell>
              <TableCell>
                <RequestStatusBadge status={request.status} endDate={request.end_date} />
              </TableCell>
              <TableCell className="text-end">
                <Button variant="secondary" size="sm" asChild>
                  <Link to={detailBase} params={{ requestId: request.id }}>
                    {variant === "admin" && request.status === "pending"
                      ? t("requests.review")
                      : t("requests.viewDetails")}
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
