import { useQuery } from "@tanstack/react-query"
import { listStatusHistoryApi } from "../apis/statusHistory.api"

export const useStatusHistory = (requestId: string) =>
  useQuery({
    queryKey: ["requests", "history", requestId],
    queryFn: () => listStatusHistoryApi(requestId),
  })
