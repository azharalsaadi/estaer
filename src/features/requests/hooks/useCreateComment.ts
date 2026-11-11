import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { APIError } from "@/types/api.types"
import { createCommentApi, type CreateCommentPayload } from "../apis/comments.api"
import type { Comment } from "../requests.types"

export const useCreateComment = () => {
  const queryClient = useQueryClient()

  return useMutation<Comment, APIError, CreateCommentPayload>({
    mutationFn: createCommentApi,
    onSuccess: (_comment, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["requests", "comments", variables.request_id],
      })
    },
  })
}
