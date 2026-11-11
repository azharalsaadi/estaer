import { useQuery } from "@tanstack/react-query"
import { getDashboardStatsApi } from "../apis/dashboard.api"

export const useDashboardStats = () =>
  useQuery({
    queryKey: ["requests", "dashboard-stats"],
    queryFn: getDashboardStatsApi,
  })
