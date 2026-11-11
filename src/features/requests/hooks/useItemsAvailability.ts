import { useQuery } from "@tanstack/react-query"
import { checkItemsAvailabilityApi } from "../apis/requests.api"

export const useItemsAvailability = (itemIds: string[]) => {
  const sortedIds = [...itemIds].sort()

  return useQuery({
    queryKey: ["items", "availability", sortedIds],
    queryFn: () => checkItemsAvailabilityApi(sortedIds),
    enabled: sortedIds.length > 0,
  })
}
