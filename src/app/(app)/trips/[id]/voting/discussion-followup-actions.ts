"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
  RedirectType,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";


const MAX_COMMENT_LENGTH =
  2000;


function getText(
  formData: FormData,
  name: string
) {
  return (
    (
      formData.get(
        name
      ) as
        | string
        | null
    )?.trim() ?? ""
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
  content: string
) {
  if (
    content.length <
    1
  ) {
    return "Reply cannot be empty";
  }


  if (
    content.length >
    MAX_COMMENT_LENGTH
  ) {
    return `Reply cannot be longer than ${MAX_COMMENT_LENGTH} characters`;
  }


  return null;
}


export async function createSuggestionReply(
  formData: FormData
) {
  const supabase =
    await createClient();


  // Authentication.
  const {
    data,
    error:
      authError,
  } =
    await supabase.auth.getClaims();


  if (
    authError ||
    !data?.claims
  ) {
    replaceRedirect(
      "/login"
    );
  }


  const userId =
    data.claims.sub;


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


  if (
    !tripId ||
    !itemId ||
    !parentCommentId
  ) {
    discussionError(
      tripId,
      itemId,
      "Invalid reply"
    );
  }


  const contentError =
    validateContent(
      content
    );


  if (
    contentError
  ) {
    discussionError(
      tripId,
      itemId,
      contentError
    );
  }


  // Confirm the reply target exists and is a
  // top-level comment in this exact discussion.
  const {
    data:
      parentComment,

    error:
      parentError,
  } =
    await supabase
      .from(
        "suggestion_comments"
      )
      .select(`
        id,
        trip_id,
        item_id,
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


  if (
    parentError
  ) {
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


  if (
    !parentComment
  ) {
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


  // Confirm the suggestion is still open.
  const {
    data:
      suggestion,

    error:
      suggestionError,
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
      .eq(
        "id",
        itemId
      )
      .eq(
        "trip_id",
        tripId
      )
      .maybeSingle();


  if (
    suggestionError
  ) {
    console.error(
      "Failed to load suggestion before replying:",
      suggestionError
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


  const {
    data:
      insertedReply,

    error:
      insertError,
  } =
    await supabase
      .from(
        "suggestion_comments"
      )
      .insert({
        trip_id:
          tripId,

        item_id:
          itemId,

        author_user_id:
          userId,

        parent_comment_id:
          parentCommentId,

        content,
      })
      .select(
        "id"
      )
      .maybeSingle();


  if (
    insertError ||
    !insertedReply
  ) {
    console.error(
      "Failed to create suggestion reply:",
      insertError
    );


    let message =
      "Unable to post reply";


    if (
      insertError?.message.includes(
        "SUGGESTION_DISCUSSION_CLOSED"
      )
    ) {
      message =
        "This discussion is closed because the suggestion is no longer open for voting";
    } else if (
      insertError?.message.includes(
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


export async function deleteSuggestionCommentSafely(
  formData: FormData
) {
  const supabase =
    await createClient();


  const {
    data,
    error:
      authError,
  } =
    await supabase.auth.getClaims();


  if (
    authError ||
    !data?.claims
  ) {
    replaceRedirect(
      "/login"
    );
  }


  const userId =
    data.claims.sub;


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

  const commentId =
    getText(
      formData,
      "commentId"
    );


  if (
    !tripId ||
    !itemId ||
    !commentId
  ) {
    discussionError(
      tripId,
      itemId,
      "Invalid comment"
    );
  }


  const {
    data:
      comment,

    error:
      commentError,
  } =
    await supabase
      .from(
        "suggestion_comments"
      )
      .select(`
        id,
        trip_id,
        item_id,
        author_user_id,
        parent_comment_id
      `)
      .eq(
        "id",
        commentId
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


  if (
    commentError
  ) {
    console.error(
      "Failed to load suggestion comment before deletion:",
      commentError
    );

    discussionError(
      tripId,
      itemId,
      "Unable to load comment"
    );
  }


  if (
    !comment
  ) {
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
      "You can only delete your own comments"
    );
  }


  // Top-level comments with replies remain in place
  // so replies never lose their conversation context.
  if (
    !comment.parent_comment_id
  ) {
    const {
      count:
        replyCount,

      error:
        replyCountError,
    } =
      await supabase
        .from(
          "suggestion_comments"
        )
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .eq(
          "parent_comment_id",
          commentId
        );


    if (
      replyCountError
    ) {
      console.error(
        "Failed to count comment replies:",
        replyCountError
      );

      discussionError(
        tripId,
        itemId,
        "Unable to delete comment"
      );
    }


    if (
      (
        replyCount ??
        0
      ) > 0
    ) {
      discussionError(
        tripId,
        itemId,
        "This comment has replies and cannot be deleted"
      );
    }
  }


  const {
    data:
      deletedComment,

    error:
      deleteError,
  } =
    await supabase
      .from(
        "suggestion_comments"
      )
      .delete()
      .eq(
        "id",
        commentId
      )
      .eq(
        "author_user_id",
        userId
      )
      .select(
        "id"
      )
      .maybeSingle();


  if (
    deleteError ||
    !deletedComment
  ) {
    console.error(
      "Failed to delete suggestion comment:",
      deleteError
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