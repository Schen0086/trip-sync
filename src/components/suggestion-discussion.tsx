import {
  cache,
} from "react";

import Avatar from "@/components/avatar";
import CloseDetailsSubmitButton from "@/components/close-details-submit-button";
import ConfirmActionButton from "@/components/confirm-action-button";
import PersonName from "@/components/person-name";

import {
  createSuggestionComment,
  deleteSuggestionComment,
  updateSuggestionComment,
} from "@/app/(app)/trips/[id]/voting/discussion-actions";

import {
  createClient,
} from "@/lib/supabase/server";


type CommentAuthor = {
  display_name:
    | string
    | null;

  username:
    | string
    | null;

  avatar_url:
    | string
    | null;
};


type SuggestionComment = {
  id: string;
  trip_id: string;
  item_id: string;
  author_user_id: string;

  content: string;

  created_at: string;
  updated_at: string;

  author:
    | CommentAuthor
    | null;
};


type SuggestionDiscussionProps = {
  tripId: string;
  itemId: string;

  currentUserId: string;

  canComment: boolean;
};


function normalizeAuthor(
  author:
    | CommentAuthor
    | CommentAuthor[]
    | null
    | undefined
): CommentAuthor | null {
  if (
    Array.isArray(
      author
    )
  ) {
    return (
      author[0] ??
      null
    );
  }


  return (
    author ??
    null
  );
}


function formatCommentTimestamp(
  value: string
) {
  return new Date(
    value
  ).toLocaleString(
    "en-IE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName:
        "short",
    }
  );
}


/**
 * All instances for the same trip share this
 * request-cached query, avoiding one database
 * request per suggestion card.
 */
const getTripDiscussionData =
  cache(
    async (
      tripId: string
    ) => {
      const supabase =
        await createClient();


      const {
        data,
        error,
      } = await supabase
        .from(
          "suggestion_comments"
        )
        .select(`
          id,
          trip_id,
          item_id,
          author_user_id,
          content,
          created_at,
          updated_at,
          author:profiles!suggestion_comments_author_user_id_fkey (
            display_name,
            username,
            avatar_url
          )
        `)
        .eq(
          "trip_id",
          tripId
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          }
        );


      if (error) {
        console.error(
          "Failed to load suggestion discussions:",
          error
        );


        return {
          commentsByItem:
            new Map<
              string,
              SuggestionComment[]
            >(),

          errorMessage:
            error.message,
        };
      }


      const commentsByItem =
        new Map<
          string,
          SuggestionComment[]
        >();


      (
        data ??
        []
      ).forEach(
        (row) => {
          const comment:
            SuggestionComment = {
            id:
              row.id,

            trip_id:
              row.trip_id,

            item_id:
              row.item_id,

            author_user_id:
              row.author_user_id,

            content:
              row.content,

            created_at:
              row.created_at,

            updated_at:
              row.updated_at,

            author:
              normalizeAuthor(
                row.author
              ),
          };


          const current =
            commentsByItem.get(
              comment.item_id
            ) ?? [];


          current.push(
            comment
          );


          commentsByItem.set(
            comment.item_id,
            current
          );
        }
      );


      return {
        commentsByItem,
        errorMessage:
          null,
      };
    }
  );


export default async function SuggestionDiscussion({
  tripId,
  itemId,
  currentUserId,
  canComment,
}: SuggestionDiscussionProps) {
  const {
    commentsByItem,
    errorMessage,
  } =
    await getTripDiscussionData(
      tripId
    );


  const comments =
    commentsByItem.get(
      itemId
    ) ?? [];


  const commentCount =
    comments.length;


  const discussionOpen =
    canComment &&
    !errorMessage;


  return (
    <details
      id={`discussion-${itemId}`}
      className="group/discussion mt-8 overflow-hidden rounded-2xl border border-line bg-surface-soft"
    >
      {/* Discussion summary */}
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 transition hover:bg-surface-hover [&::-webkit-details-marker]:hidden sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-ink">
              Discussion
            </h4>


            <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted">
              {
                commentCount
              }{" "}
              {commentCount ===
              1
                ? "comment"
                : "comments"}
            </span>


            {!canComment && (
              <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-subtle">
                Read only
              </span>
            )}
          </div>


          <p className="mt-1 text-sm text-muted">
            {canComment
              ? "Share thoughts and questions about this suggestion."
              : "The discussion is preserved with the final voting history."}
          </p>
        </div>


        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-muted transition-transform group-open/discussion:rotate-180"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>


      <div className="border-t border-line p-4 sm:p-5">
        {/* Loading error */}
        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text"
          >
            The discussion could
            not be loaded. Refresh
            the page and try again.
          </div>
        )}


        {/* Empty discussion */}
        {!errorMessage &&
        comments.length ===
          0 ? (
          <div className="rounded-xl border border-dashed border-line bg-surface px-5 py-7 text-center">
            <p className="font-medium text-ink">
              No comments yet
            </p>

            <p className="mt-1 text-sm text-muted">
              {canComment
                ? "Start the discussion about this suggestion."
                : "Nobody commented before this suggestion was closed."}
            </p>
          </div>
        ) : null}


        {/* Existing comments */}
        {!errorMessage &&
          comments.length >
            0 && (
          <div className="divide-y divide-line">
            {comments.map(
              (
                comment
              ) => {
                const authorName =
                  comment
                    .author
                    ?.display_name ??
                  "Traveller";


                const avatarUrl =
                  comment
                    .author
                    ?.avatar_url ??
                  null;


                const isOwnComment =
                  comment.author_user_id ===
                  currentUserId;


                const wasEdited =
                  comment.updated_at !==
                  comment.created_at;


                return (
                  <article
                    key={
                      comment.id
                    }
                    className="py-5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start gap-3">
                      {/* Author avatar */}
                      <Avatar
                        src={
                          avatarUrl
                        }
                        displayName={
                          authorName
                        }
                        size="md"
                      />


                      <div className="min-w-0 flex-1">
                        {/* Comment metadata */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <PersonName
                            userId={
                              comment.author_user_id
                            }
                            currentUserId={
                              currentUserId
                            }
                            displayName={
                              authorName
                            }
                            highlightCurrentUser
                          />


                          <span
                            aria-hidden="true"
                            className="text-subtle"
                          >
                            ·
                          </span>


                          <time
                            dateTime={
                              comment.created_at
                            }
                            className="text-xs text-subtle"
                          >
                            {formatCommentTimestamp(
                              comment.created_at
                            )}
                          </time>


                          {wasEdited && (
                            <span className="text-xs text-subtle">
                              Edited
                            </span>
                          )}
                        </div>


                        {/* Comment body */}
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
                          {
                            comment.content
                          }
                        </p>


                        {/* Own comment controls */}
                        {discussionOpen &&
                          isOwnComment && (
                          <div className="mt-3 flex flex-wrap items-start gap-1">
                            {/* Edit */}
                            <details className="group/comment-edit min-w-0">
                              <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-lg px-2 text-xs font-medium leading-none text-brand-700 transition hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-brand-100 [&::-webkit-details-marker]:hidden">
                                Edit
                              </summary>


                              <form
                                action={
                                  updateSuggestionComment
                                }
                                className="mt-2 min-w-0 space-y-3 sm:w-[30rem]"
                              >
                                <input
                                  type="hidden"
                                  name="tripId"
                                  value={
                                    tripId
                                  }
                                />

                                <input
                                  type="hidden"
                                  name="itemId"
                                  value={
                                    itemId
                                  }
                                />

                                <input
                                  type="hidden"
                                  name="commentId"
                                  value={
                                    comment.id
                                  }
                                />


                                <label
                                  htmlFor={`edit-comment-${comment.id}`}
                                  className="sr-only"
                                >
                                  Edit comment
                                </label>


                                <textarea
                                  id={`edit-comment-${comment.id}`}
                                  name="content"
                                  required
                                  minLength={1}
                                  maxLength={2000}
                                  rows={4}
                                  defaultValue={
                                    comment.content
                                  }
                                  className="w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                                />


                                <div className="flex flex-wrap items-center gap-3">
                                  <CloseDetailsSubmitButton
                                    className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
                                  >
                                    Save changes
                                  </CloseDetailsSubmitButton>
                                </div>
                              </form>
                            </details>


                            {/* Delete */}
                            <form
                              action={
                                deleteSuggestionComment
                              }
                              className="m-0 flex h-8 items-start"
                            >
                              <input
                                type="hidden"
                                name="tripId"
                                value={
                                  tripId
                                }
                              />

                              <input
                                type="hidden"
                                name="itemId"
                                value={
                                  itemId
                                }
                              />

                              <input
                                type="hidden"
                                name="commentId"
                                value={
                                  comment.id
                                }
                              />


                              <ConfirmActionButton
                                message="Delete this comment?"
                                className="inline-flex h-8 cursor-pointer items-center rounded-lg px-2 text-xs font-medium leading-none text-danger-text transition hover:bg-danger-surface focus:outline-none focus:ring-2 focus:ring-danger-border"
                              >
                                Delete
                              </ConfirmActionButton>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}


        {/* Add new comment */}
        {discussionOpen && (
          <form
            action={
              createSuggestionComment
            }
            className={`${
              comments.length >
              0
                ? "mt-5 border-t border-line pt-5"
                : "mt-5"
            }`}
          >
            <input
              type="hidden"
              name="tripId"
              value={
                tripId
              }
            />

            <input
              type="hidden"
              name="itemId"
              value={
                itemId
              }
            />


            <label
              htmlFor={`new-comment-${itemId}`}
              className="block text-sm font-medium text-ink"
            >
              Add a comment
            </label>


            <textarea
              id={`new-comment-${itemId}`}
              name="content"
              required
              minLength={1}
              maxLength={2000}
              rows={4}
              placeholder="Share a thought, question or reason for your vote..."
              className="mt-2 w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />


            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-subtle">
                Maximum 2,000
                characters.
              </p>


              <button
                type="submit"
                className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
              >
                Post comment
              </button>
            </div>
          </form>
        )}


        {/* Historical discussion notice */}
        {!canComment &&
          !errorMessage && (
          <div
            className={
              comments.length >
              0
                ? "mt-5 border-t border-line pt-4"
                : "mt-5"
            }
          >
            <p className="text-xs leading-5 text-subtle">
              This discussion is
              read only because
              the suggestion is no
              longer open for
              voting. Restoring
              the suggestion to
              voting will reopen
              the discussion.
            </p>
          </div>
        )}
      </div>
    </details>
  );
}