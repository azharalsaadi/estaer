import { useQuery } from "@tanstack/react-query"
import { listMyRequestsApi, type RequestFilters } from "../apis/requests.api"

export const useMyRequests = (filters: RequestFilters) =>
  useQuery({
    queryKey: ["requests", "mine", filters],
    queryFn: () => listMyRequestsApi(filters),
  })
