import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { useComments } from "../hooks/useComments"
import { useCreateComment } from "../hooks/useCreateComment"
import { commentSchema, type CommentFormData } from "../requests.schema"

type CommentsSectionProps = {
  requestId: string
  requestOwnerId: string
  /** Only known to an admin viewer (RLS blocks a member from reading
   * anyone else's profile) — undefined for a member viewing their own
   * thread, where it's unnecessary anyway (they ARE the owner). */
  requestOwnerEmail?: string
}

export function CommentsSection({
  requestId,
  requestOwnerId,
  requestOwnerEmail,
}: CommentsSectionProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const commentsQuery = useComments(requestId)
  const createComment = useCreateComment()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: "" },
  })

  const onSubmit = handleSubmit((values) => {
    createComment.mutate(
      { request_id: requestId, body: values.body },
      { onSuccess: () => reset({ body: "" }) }
    )
  })

  const authorLabel = (authorId: string): string => {
    if (authorId === user?.id) return t("requests.commentByYou")
    if (authorId === requestOwnerId)
      return requestOwnerEmail ?? t("requests.historyByMember")
    return t("requests.commentByAdmin")
  }

  return (
    <div>
      <h2 className="text-foreground text-lg font-semibold">
        {t("requests.commentsTitle")}
      </h2>

      <div className="mt-4 space-y-3">
        {commentsQuery.isLoading ? (
          <>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </>
        ) : (commentsQuery.data ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("requests.noComments")}</p>
        ) : (
          (commentsQuery.data ?? []).map((comment) => (
            <div key={comment.id} className="bg-muted rounded-lg p-3 text-sm">
              <p className="text-muted-foreground text-xs font-medium">
                {authorLabel(comment.author_id)}
              </p>
              {/* Untrusted text rendered as plain text only — never dangerouslySetInnerHTML. */}
              <p className="text-foreground mt-1 whitespace-pre-wrap">{comment.body}</p>
            </div>
          ))
        )}
      </div>

      <form
        className="mt-4 space-y-2"
        onSubmit={(event) => void onSubmit(event)}
        noValidate
      >
        <Label htmlFor="comment-body">{t("fields.comment")}</Label>
        <Textarea
          id="comment-body"
          placeholder={t("fields.commentPlaceholder")}
          {...register("body")}
        />
        {errors.body && (
          <p className="text-destructive text-xs">{t(errors.body.message ?? "")}</p>
        )}
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={createComment.isPending}>
            {t("requests.postComment")}
          </Button>
        </div>
      </form>
    </div>
  )
}
