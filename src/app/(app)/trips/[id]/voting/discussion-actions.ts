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
}


function validateCommentContent(
  content: string
) {
  if (
    content.length < 1
  ) {
    return "Comment cannot be empty";
  }


  if (
    content.length >
    MAX_COMMENT_LENGTH
  ) {
    return `Comment cannot be longer than ${MAX_COMMENT_LENGTH} characters`;
  }


  return null;
}


export async function createSuggestionComment(
  formData: FormData
) {
  const supabase =
    await createClient();


  // Authentication
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

  const content =
    getText(
      formData,
      "content"
    );


  if (
    !tripId ||
    !itemId
  ) {
    discussionError(
      tripId,
      itemId,
      "Invalid discussion"
    );
  }


  const contentError =
    validateCommentContent(
      content
    );


  if (contentError) {
    discussionError(
      tripId,
      itemId,
      contentError
    );
  }


  // Confirm that this is still an open
  // suggestion before attempting the insert.
  const {
    data:
      suggestion,
    error:
      suggestionError,
  } = await supabase
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
      "Failed to load suggestion before commenting:",
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


  // Insert the comment.
  const {
    data:
      insertedComment,
    error:
      insertError,
  } = await supabase
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

      content,
    })
    .select(
      "id"
    )
    .maybeSingle();


  if (
    insertError ||
    !insertedComment
  ) {
    console.error(
      "Failed to create suggestion comment:",
      insertError
    );


    const message =
      insertError?.message.includes(
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


export async function updateSuggestionComment(
  formData: FormData
) {
  const supabase =
    await createClient();


  // Authentication
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

  const content =
    getText(
      formData,
      "content"
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


  const contentError =
    validateCommentContent(
      content
    );


  if (contentError) {
    discussionError(
      tripId,
      itemId,
      contentError
    );
  }


  // Confirm ownership before updating.
  const {
    data:
      comment,
    error:
      commentError,
  } = await supabase
    .from(
      "suggestion_comments"
    )
    .select(`
      id,
      trip_id,
      item_id,
      author_user_id
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
      "Failed to load suggestion comment:",
      commentError
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
      "You can only edit your own comments"
    );
  }


  // RLS also verifies that the suggestion is
  // still open for voting.
  const {
    data:
      updatedComment,
    error:
      updateError,
  } = await supabase
    .from(
      "suggestion_comments"
    )
    .update({
      content,
    })
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
    updateError ||
    !updatedComment
  ) {
    console.error(
      "Failed to update suggestion comment:",
      updateError
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


export async function deleteSuggestionComment(
  formData: FormData
) {
  const supabase =
    await createClient();


  // Authentication
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


  // Confirm ownership.
  const {
    data:
      comment,
    error:
      commentError,
  } = await supabase
    .from(
      "suggestion_comments"
    )
    .select(`
      id,
      trip_id,
      item_id,
      author_user_id
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
      "You can only delete your own comments"
    );
  }


  // RLS also requires the suggestion to
  // remain open for voting.
  const {
    data:
      deletedComment,
    error:
      deleteError,
  } = await supabase
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