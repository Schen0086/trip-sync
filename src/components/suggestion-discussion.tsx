import {
  cache,
} from "react";

import Avatar from "@/components/avatar";
import CloseDetailsSubmitButton from "@/components/close-details-submit-button";
import ConfirmActionButton from "@/components/confirm-action-button";
import DiscussionReadMarker from "@/components/discussion-read-marker";
import PersonName from "@/components/person-name";

import {
  createSuggestionComment,
  updateSuggestionComment,
} from "@/app/(app)/trips/[id]/voting/discussion-actions";

import {
  createSuggestionReply,
  deleteSuggestionCommentSafely,
} from "@/app/(app)/trips/[id]/voting/discussion-followup-actions";

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

  parent_comment_id:
    | string
    | null;

  content: string;

  created_at: string;

  updated_at: string;

  author:
    | CommentAuthor
    | null;
};


type DiscussionReadRow = {
  item_id: string;

  last_read_at: string;
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
      day:
        "numeric",

      month:
        "short",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",

      timeZone:
        "UTC",

      timeZoneName:
        "short",
    }
  );
}


/**
 * Every discussion component on the same voting page
 * shares this request-cached query.
 *
 * Comments and read-state are both loaded once rather
 * than creating a database request for every suggestion.
 */
const getTripDiscussionData =
  cache(
    async (
      tripId: string,
      currentUserId: string
    ) => {
      const supabase =
        await createClient();


      const [
        commentsResult,
        readsResult,
      ] =
        await Promise.all([
          supabase
            .from(
              "suggestion_comments"
            )
            .select(`
              id,
              trip_id,
              item_id,
              author_user_id,
              parent_comment_id,
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
            ),

          supabase
            .from(
              "suggestion_discussion_reads"
            )
            .select(`
              item_id,
              last_read_at
            `)
            .eq(
              "trip_id",
              tripId
            )
            .eq(
              "user_id",
              currentUserId
            ),
        ]);


      if (
        commentsResult.error
      ) {
        console.error(
          "Failed to load suggestion discussions:",
          commentsResult.error
        );


        return {
          commentsByItem:
            new Map<
              string,
              SuggestionComment[]
            >(),

          readAtByItem:
            new Map<
              string,
              string
            >(),

          errorMessage:
            commentsResult
              .error
              .message,
        };
      }


      if (
        readsResult.error
      ) {
        console.error(
          "Failed to load discussion read state:",
          readsResult.error
        );
      }


      const commentsByItem =
        new Map<
          string,
          SuggestionComment[]
        >();


      (
        commentsResult.data ??
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

            parent_comment_id:
              row.parent_comment_id ??
              null,

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


      const readAtByItem =
        new Map<
          string,
          string
        >();


      (
        (
          readsResult.data ??
          []
        ) as DiscussionReadRow[]
      ).forEach(
        (read) => {
          readAtByItem.set(
            read.item_id,
            read.last_read_at
          );
        }
      );


      return {
        commentsByItem,

        readAtByItem,

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
    readAtByItem,
    errorMessage,
  } =
    await getTripDiscussionData(
      tripId,
      currentUserId
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


  const lastReadAt =
    readAtByItem.get(
      itemId
    ) ??
    null;


  const unreadCount =
    comments.filter(
      (comment) => {
        // Your own messages should never
        // appear unread to you.
        if (
          comment.author_user_id ===
          currentUserId
        ) {
          return false;
        }


        if (
          !lastReadAt
        ) {
          return true;
        }


        return (
          new Date(
            comment.created_at
          ).getTime() >
          new Date(
            lastReadAt
          ).getTime()
        );
      }
    ).length;


  const commentIds =
    new Set(
      comments.map(
        (comment) =>
          comment.id
      )
    );


  // A reply whose parent no longer exists is
  // rendered as a main comment as a defensive
  // fallback, though the FK normally prevents this.
  const mainComments =
    comments.filter(
      (comment) =>
        !comment.parent_comment_id ||
        !commentIds.has(
          comment.parent_comment_id
        )
    );


  const repliesByParent =
    new Map<
      string,
      SuggestionComment[]
    >();


  comments.forEach(
    (comment) => {
      if (
        !comment.parent_comment_id
      ) {
        return;
      }


      const current =
        repliesByParent.get(
          comment.parent_comment_id
        ) ?? [];


      current.push(
        comment
      );


      repliesByParent.set(
        comment.parent_comment_id,
        current
      );
    }
  );


  function renderComment(
    comment:
      SuggestionComment,

    isReply:
      boolean,

    childReplies:
      SuggestionComment[] = []
  ) {
    const authorName =
      comment.author
        ?.display_name ??
      "Traveller";


    const avatarUrl =
      comment.author
        ?.avatar_url ??
      null;


    const isOwnComment =
      comment.author_user_id ===
      currentUserId;


    const wasEdited =
      comment.updated_at !==
      comment.created_at;


    const canDelete =
      discussionOpen &&
      isOwnComment &&
      (
        isReply ||
        childReplies.length ===
          0
      );


    return (
      <article
        id={`comment-${comment.id}`}
        key={
          comment.id
        }
        className={
          isReply
            ? "scroll-mt-28 py-4"
            : "scroll-mt-28 py-5 first:pt-0 last:pb-0"
        }
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
            size={
              isReply
                ? "sm"
                : "md"
            }
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


              {isReply && (
                <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-subtle">
                  Reply
                </span>
              )}


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


            {/* Comment controls */}
            {discussionOpen && (
              <div className="mt-3 flex flex-wrap items-start gap-1">
                {/* Reply only to top-level comments. */}
                {!isReply && (
                  <details className="group/comment-reply min-w-0">
                    <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-lg px-2 text-xs font-medium leading-none text-brand-700 transition hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-brand-100 [&::-webkit-details-marker]:hidden">
                      Reply
                    </summary>


                    <form
                      action={
                        createSuggestionReply
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
                        name="parentCommentId"
                        value={
                          comment.id
                        }
                      />


                      <label
                        htmlFor={`reply-comment-${comment.id}`}
                        className="text-xs font-medium text-muted"
                      >
                        Reply to{" "}
                        {
                          authorName
                        }
                      </label>


                      <textarea
                        id={`reply-comment-${comment.id}`}
                        name="content"
                        required
                        minLength={
                          1
                        }
                        maxLength={
                          2000
                        }
                        rows={
                          3
                        }
                        placeholder="Write a reply..."
                        className="w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                      />


                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-subtle">
                          Maximum 2,000 characters.
                        </p>

                        <CloseDetailsSubmitButton
                          className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-brand-contrast transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
                        >
                          Post reply
                        </CloseDetailsSubmitButton>
                      </div>
                    </form>
                  </details>
                )}


                {/* Edit own comment/reply */}
                {isOwnComment && (
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
                        Edit{" "}
                        {isReply
                          ? "reply"
                          : "comment"}
                      </label>


                      <textarea
                        id={`edit-comment-${comment.id}`}
                        name="content"
                        required
                        minLength={
                          1
                        }
                        maxLength={
                          2000
                        }
                        rows={
                          4
                        }
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
                )}


                {/* Safe delete */}
                {canDelete && (
                  <form
                    action={
                      deleteSuggestionCommentSafely
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
                      message={
                        isReply
                          ? "Delete this reply?"
                          : "Delete this comment?"
                      }
                      className="inline-flex h-8 cursor-pointer items-center rounded-lg px-2 text-xs font-medium leading-none text-danger-text transition hover:bg-danger-surface focus:outline-none focus:ring-2 focus:ring-danger-border"
                    >
                      Delete
                    </ConfirmActionButton>
                  </form>
                )}


                {/* Preserve conversation context. */}
                {discussionOpen &&
                  isOwnComment &&
                  !isReply &&
                  childReplies.length >
                    0 && (
                  <span className="inline-flex h-8 items-center px-2 text-xs text-subtle">
                    Cannot delete while replies exist
                  </span>
                )}
              </div>
            )}
          </div>
        </div>


        {/* One-level reply thread */}
        {!isReply &&
          childReplies.length >
            0 && (
          <div className="ml-4 mt-4 border-l-2 border-line pl-4 sm:ml-12 sm:pl-5">
            {childReplies.map(
              (reply) =>
                renderComment(
                  reply,
                  true
                )
            )}
          </div>
        )}
      </article>
    );
  }


  return (
    <details
      id={`discussion-${itemId}`}
      className="group/discussion mt-8 scroll-mt-28 overflow-hidden rounded-2xl border border-line bg-surface-soft"
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


            <DiscussionReadMarker
              tripId={
                tripId
              }
              itemId={
                itemId
              }
              initialUnreadCount={
                unreadCount
              }
            />


            {!canComment && (
              <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-subtle">
                Read only
              </span>
            )}
          </div>


          <p className="mt-1 text-sm text-muted">
            {canComment
              ? "Share thoughts, questions and replies about this suggestion."
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
            The discussion could not be loaded. Refresh the page and try again.
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


        {/* Existing threaded comments */}
        {!errorMessage &&
          mainComments.length >
            0 && (
          <div className="divide-y divide-line">
            {mainComments.map(
              (
                comment
              ) =>
                renderComment(
                  comment,
                  false,
                  repliesByParent.get(
                    comment.id
                  ) ?? []
                )
            )}
          </div>
        )}


        {/* Add new top-level comment */}
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
              minLength={
                1
              }
              maxLength={
                2000
              }
              rows={
                4
              }
              placeholder="Share a thought, question or reason for your vote..."
              className="mt-2 w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />


            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-subtle">
                Maximum 2,000 characters.
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
              This discussion is read only because the suggestion is no longer open for voting. Restoring the suggestion to voting will reopen the discussion.
            </p>
          </div>
        )}
      </div>
    </details>
  );
}