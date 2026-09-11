"use server";

import { revalidatePath } from "next/cache";
import {
  redirect,
  RedirectType,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";


type SupabaseServerClient =
  Awaited<
    ReturnType<
      typeof createClient
    >
  >;


type DiscussionFormValues = {
  tripId: string;
  itemId: string;
};


type OwnedComment = {
  id: string;
  author_user_id: string;
  parent_comment_id:
    | string
    | null;
};


const MAX_COMMENT_LENGTH =
  2000;


function getText(
  formData: FormData,
  name: string
) {
  return (
    formData
      .get(name)
      ?.toString()
      .trim() ?? ""
  );
}


function replaceRedirect(
  path: string
): never {
  redirect(
    path,
    RedirectType.replace
  );
}


function discussionError(
  tripId: string,
  itemId: string,
  message: string
): never {
  if (!tripId) {
    replaceRedirect(
      "/dashboard"
    );
  }

  const anchor =
    itemId
      ? `#item-${itemId}`
      : "";

  replaceRedirect(
    `/trips/${tripId}/voting?error=${encodeURIComponent(
      message
    )}${anchor}`
  );
}


function refreshDiscussionViews(
  tripId: string
) {
  revalidatePath(
    `/trips/${tripId}`
  );
  revalidatePath(
    `/trips/${tripId}/voting`
  );
  revalidatePath(
    `/trips/${tripId}/activity`
  );
  revalidatePath(
    "/notifications"
  );
}


function validateContent(
  content: string,
  label: "Comment" | "Reply"
) {
  if (content.length < 1) {
    return `${label} cannot be empty`;
  }

  if (
    content.length >
    MAX_COMMENT_LENGTH
  ) {
    return `${label} cannot be longer than ${MAX_COMMENT_LENGTH} characters`;
  }

  return null;
}


function getDiscussionFormValues(
  formData: FormData,
  invalidMessage =
    "Invalid discussion"
): DiscussionFormValues {
  const tripId =
    getText(
      formData,
      "tripId"
    );
  const itemId =
    getText(
      formData,
      "itemId"
    );

  if (!tripId || !itemId) {
    discussionError(
      tripId,
      itemId,
      invalidMessage
    );
  }

  return {
    tripId,
    itemId,
  };
}


async function requireUserId(
  supabase: SupabaseServerClient
) {
  const {
    data,
    error,
  } =
    await supabase.auth.getClaims();

  if (
    error ||
    !data?.claims
  ) {
    replaceRedirect(
      "/login"
    );
  }

  return data.claims.sub;
}


async function assertOpenSuggestion(
  supabase: SupabaseServerClient,
  tripId: string,
  itemId: string
) {
  const {
    data: suggestion,
    error,
  } =
    await supabase
      .from(
        "itinerary_items"
      )
      .select(`
        id,
        origin,
        planning_status
      `)
      .eq("id", itemId)
      .eq(
        "trip_id",
        tripId
      )
      .maybeSingle();

  if (error) {
    console.error(
      "Failed to load suggestion discussion:",
      error
    );

    discussionError(
      tripId,
      itemId,
      "Unable to open this discussion"
    );
  }

  if (
    !suggestion ||
    suggestion.origin !==
      "suggestion"
  ) {
    discussionError(
      tripId,
      itemId,
      "Suggestion not found"
    );
  }

  if (
    suggestion.planning_status !==
      "suggested"
  ) {
    discussionError(
      tripId,
      itemId,
      "This discussion is closed because the suggestion is no longer open for voting"
    );
  }
}


async function getOwnedComment(
  supabase: SupabaseServerClient,
  {
    tripId,
    itemId,
  }: DiscussionFormValues,
  commentId: string,
  userId: string
): Promise<OwnedComment> {
  const {
    data: comment,
    error,
  } =
    await supabase
      .from(
        "suggestion_comments"
      )
      .select(`
        id,
        author_user_id,
        parent_comment_id
      `)
      .eq("id", commentId)
      .eq(
        "trip_id",
        tripId
      )
      .eq(
        "item_id",
        itemId
      )
      .maybeSingle();

  if (error) {
    console.error(
      "Failed to load suggestion comment:",
      error
    );

    discussionError(
      tripId,
      itemId,
      "Unable to load comment"
    );
  }

  if (!comment) {
    discussionError(
      tripId,
      itemId,
      "Comment not found"
    );
  }

  if (
    comment.author_user_id !==
      userId
  ) {
    discussionError(
      tripId,
      itemId,
      "You can only change your own comments"
    );
  }

  return comment;
}


export async function createSuggestionComment(
  formData: FormData
) {
  const supabase =
    await createClient();
  const userId =
    await requireUserId(
      supabase
    );

  const {
    tripId,
    itemId,
  } =
    getDiscussionFormValues(
      formData
    );
  const content =
    getText(
      formData,
      "content"
    );

  const contentError =
    validateContent(
      content,
      "Comment"
    );

  if (contentError) {
    discussionError(
      tripId,
      itemId,
      contentError
    );
  }

  await assertOpenSuggestion(
    supabase,
    tripId,
    itemId
  );

  const {
    data: insertedComment,
    error,
  } =
    await supabase
      .from(
        "suggestion_comments"
      )
      .insert({
        trip_id: tripId,
        item_id: itemId,
        author_user_id:
          userId,
        parent_comment_id:
          null,
        content,
      })
      .select("id")
      .maybeSingle();

  if (
    error ||
    !insertedComment
  ) {
    console.error(
      "Failed to create suggestion comment:",
      error
    );

    const message =
      error?.message.includes(
        "SUGGESTION_DISCUSSION_CLOSED"
      )
        ? "This discussion is closed because the suggestion is no longer open for voting"
        : "Unable to post comment";

    discussionError(
      tripId,
      itemId,
      message
    );
  }

  refreshDiscussionViews(
    tripId
  );
}


export async function createSuggestionReply(
  formData: FormData
) {
  const supabase =
    await createClient();
  const userId =
    await requireUserId(
      supabase
    );

  const {
    tripId,
    itemId,
  } =
    getDiscussionFormValues(
      formData,
      "Invalid reply"
    );
  const parentCommentId =
    getText(
      formData,
      "parentCommentId"
    );
  const content =
    getText(
      formData,
      "content"
    );

  if (!parentCommentId) {
    discussionError(
      tripId,
      itemId,
      "Invalid reply"
    );
  }

  const contentError =
    validateContent(
      content,
      "Reply"
    );

  if (contentError) {
    discussionError(
      tripId,
      itemId,
      contentError
    );
  }

  const {
    data: parentComment,
    error: parentError,
  } =
    await supabase
      .from(
        "suggestion_comments"
      )
      .select(`
        id,
        parent_comment_id
      `)
      .eq(
        "id",
        parentCommentId
      )
      .eq(
        "trip_id",
        tripId
      )
      .eq(
        "item_id",
        itemId
      )
      .maybeSingle();

  if (parentError) {
    console.error(
      "Failed to load reply target:",
      parentError
    );

    discussionError(
      tripId,
      itemId,
      "Unable to reply to this comment"
    );
  }

  if (!parentComment) {
    discussionError(
      tripId,
      itemId,
      "Comment not found"
    );
  }

  if (
    parentComment.parent_comment_id
  ) {
    discussionError(
      tripId,
      itemId,
      "Replies can only be added to main comments"
    );
  }

  await assertOpenSuggestion(
    supabase,
    tripId,
    itemId
  );

  const {
    data: insertedReply,
    error,
  } =
    await supabase
      .from(
        "suggestion_comments"
      )
      .insert({
        trip_id: tripId,
        item_id: itemId,
        author_user_id:
          userId,
        parent_comment_id:
          parentCommentId,
        content,
      })
      .select("id")
      .maybeSingle();

  if (
    error ||
    !insertedReply
  ) {
    console.error(
      "Failed to create suggestion reply:",
      error
    );

    let message =
      "Unable to post reply";

    if (
      error?.message.includes(
        "SUGGESTION_DISCUSSION_CLOSED"
      )
    ) {
      message =
        "This discussion is closed because the suggestion is no longer open for voting";
    } else if (
      error?.message.includes(
        "SUGGESTION_REPLY_DEPTH_EXCEEDED"
      )
    ) {
      message =
        "Replies can only be added to main comments";
    }

    discussionError(
      tripId,
      itemId,
      message
    );
  }

  refreshDiscussionViews(
    tripId
  );
}


export async function updateSuggestionComment(
  formData: FormData
) {
  const supabase =
    await createClient();
  const userId =
    await requireUserId(
      supabase
    );

  const context =
    getDiscussionFormValues(
      formData,
      "Invalid comment"
    );
  const {
    tripId,
    itemId,
  } = context;
  const commentId =
    getText(
      formData,
      "commentId"
    );
  const content =
    getText(
      formData,
      "content"
    );

  if (!commentId) {
    discussionError(
      tripId,
      itemId,
      "Invalid comment"
    );
  }

  const contentError =
    validateContent(
      content,
      "Comment"
    );

  if (contentError) {
    discussionError(
      tripId,
      itemId,
      contentError
    );
  }

  await assertOpenSuggestion(
    supabase,
    tripId,
    itemId
  );
  await getOwnedComment(
    supabase,
    context,
    commentId,
    userId
  );

  const {
    data: updatedComment,
    error,
  } =
    await supabase
      .from(
        "suggestion_comments"
      )
      .update({ content })
      .eq("id", commentId)
      .eq(
        "author_user_id",
        userId
      )
      .select("id")
      .maybeSingle();

  if (
    error ||
    !updatedComment
  ) {
    console.error(
      "Failed to update suggestion comment:",
      error
    );

    discussionError(
      tripId,
      itemId,
      "Unable to edit comment. The discussion may already be closed."
    );
  }

  refreshDiscussionViews(
    tripId
  );
}


export async function deleteSuggestionCommentSafely(
  formData: FormData
) {
  const supabase =
    await createClient();
  const userId =
    await requireUserId(
      supabase
    );

  const context =
    getDiscussionFormValues(
      formData,
      "Invalid comment"
    );
  const {
    tripId,
    itemId,
  } = context;
  const commentId =
    getText(
      formData,
      "commentId"
    );

  if (!commentId) {
    discussionError(
      tripId,
      itemId,
      "Invalid comment"
    );
  }

  await assertOpenSuggestion(
    supabase,
    tripId,
    itemId
  );

  const comment =
    await getOwnedComment(
      supabase,
      context,
      commentId,
      userId
    );

  if (
    !comment.parent_comment_id
  ) {
    const {
      count: replyCount,
      error: countError,
    } =
      await supabase
        .from(
          "suggestion_comments"
        )
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "parent_comment_id",
          commentId
        );

    if (countError) {
      console.error(
        "Failed to count comment replies:",
        countError
      );

      discussionError(
        tripId,
        itemId,
        "Unable to delete comment"
      );
    }

    if (
      (replyCount ?? 0) > 0
    ) {
      discussionError(
        tripId,
        itemId,
        "This comment has replies and cannot be deleted"
      );
    }
  }

  const {
    data: deletedComment,
    error,
  } =
    await supabase
      .from(
        "suggestion_comments"
      )
      .delete()
      .eq("id", commentId)
      .eq(
        "author_user_id",
        userId
      )
      .select("id")
      .maybeSingle();

  if (
    error ||
    !deletedComment
  ) {
    console.error(
      "Failed to delete suggestion comment:",
      error
    );

    discussionError(
      tripId,
      itemId,
      "Unable to delete comment. The discussion may already be closed."
    );
  }

  refreshDiscussionViews(
    tripId
  );
}


/**
 * Compatibility export for any older call sites that still import the
 * original delete action name. New discussion UI should use the safe action.
 */
export async function deleteSuggestionComment(
  formData: FormData
) {
  await deleteSuggestionCommentSafely(
    formData
  );
}
