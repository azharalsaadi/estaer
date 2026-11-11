import { useQuery } from "@tanstack/react-query"
import { getRequestByIdApi } from "../apis/requests.api"

export const useRequest = (requestId: string, isAdmin: boolean) =>
  useQuery({
    queryKey: ["requests", "detail", requestId],
    queryFn: () => getRequestByIdApi(requestId, isAdmin),
  })
