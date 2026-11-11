import { useQuery } from "@tanstack/react-query"
import { getItemBookedRangesApi } from "../apis/requests.api"

export const useItemBookedRanges = (itemId: string) =>
  useQuery({
    queryKey: ["items", "booked-ranges", itemId],
    queryFn: () => getItemBookedRangesApi(itemId),
  })
