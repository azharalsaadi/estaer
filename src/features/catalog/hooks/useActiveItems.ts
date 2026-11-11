import { useQuery } from "@tanstack/react-query"
import { listActiveItemsApi } from "../apis/items.api"

export const useActiveItems = () =>
  useQuery({
    queryKey: ["items", "active"],
    queryFn: listActiveItemsApi,
  })
