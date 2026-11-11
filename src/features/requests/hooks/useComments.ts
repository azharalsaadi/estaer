import { useQuery } from "@tanstack/react-query"
import { listCommentsApi } from "../apis/comments.api"

export const useComments = (requestId: string) =>
  useQuery({
    queryKey: ["requests", "comments", requestId],
    queryFn: () => listCommentsApi(requestId),
  })
