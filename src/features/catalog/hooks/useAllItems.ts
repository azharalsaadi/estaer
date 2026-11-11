import { useQuery } from "@tanstack/react-query"
import { listAllItemsApi } from "../apis/items.api"

export const useAllItems = () =>
  useQuery({
    queryKey: ["items", "all"],
    queryFn: listAllItemsApi,
  })
