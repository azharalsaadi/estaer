import { useQuery } from "@tanstack/react-query"
import { listAllRequestsApi, type RequestFilters } from "../apis/requests.api"

export const useAllRequests = (filters: RequestFilters) =>
  useQuery({
    queryKey: ["requests", "all", filters],
    queryFn: () => listAllRequestsApi(filters),
  })
