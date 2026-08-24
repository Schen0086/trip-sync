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

import {
  isTaskPriority,
} from "@/lib/tasks";


function replaceRedirect(
  path: string
): never {
  redirect(
    path,
    RedirectType.replace
  );
}


function getText(
  formData: FormData,
  name: string
) {
  return (
    (
      formData.get(name) as
        | string
        | null
    )?.trim() ?? ""
  );
}


function optionalText(
  formData: FormData,
  name: string
) {
  return (
    getText(
      formData,
      name
    ) || null
  );
}


function validDateInput(
  value: string | null
) {
  if (!value) {
    return true;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return false;
  }

  return !Number.isNaN(
    new Date(
      `${value}T00:00:00Z`
    ).getTime()
  );
}


function refreshTasks(
  tripId: string
) {
  revalidatePath(
    "/dashboard"
  );

  revalidatePath(
    `/trips/${tripId}`
  );

  revalidatePath(
    `/trips/${tripId}/tasks`
  );
}


export async function addTripTask(
  formData: FormData
) {
  const supabase =
    await createClient();

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

  const userId =
    data.claims.sub;

  const tripId =
    getText(
      formData,
      "tripId"
    );

  const title =
    getText(
      formData,
      "title"
    );

  const description =
    optionalText(
      formData,
      "description"
    );

  const assignedTo =
    optionalText(
      formData,
      "assignedTo"
    );

  const dueDate =
    optionalText(
      formData,
      "dueDate"
    );

  const priority =
    getText(
      formData,
      "priority"
    );

  const errorPath =
    `/trips/${tripId}/tasks`;

  if (
    !tripId ||
    !title ||
    title.length >
      160
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Enter a task title of 160 characters or fewer"
      )}`
    );
  }

  if (
    description &&
    description.length >
      1200
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Task description must be 1200 characters or fewer"
      )}`
    );
  }

  if (
    !isTaskPriority(
      priority
    )
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Choose a valid task priority"
      )}`
    );
  }

  if (
    !validDateInput(
      dueDate
    )
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Choose a valid due date"
      )}`
    );
  }

  const {
    error: insertError,
  } = await supabase
    .from("trip_tasks")
    .insert({
      trip_id:
        tripId,

      created_by:
        userId,

      assigned_to:
        assignedTo,

      title,

      description,

      due_date:
        dueDate,

      priority,

      status:
        "open",
    });

  if (insertError) {
    console.error(
      "Failed to add trip task:",
      insertError
    );

    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        insertError.message
      )}`
    );
  }

  refreshTasks(
    tripId
  );

  replaceRedirect(
    `${errorPath}?success=${encodeURIComponent(
      "Responsibility added"
    )}`
  );
}


export async function updateTripTask(
  formData: FormData
) {
  const supabase =
    await createClient();

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

  const tripId =
    getText(
      formData,
      "tripId"
    );

  const taskId =
    getText(
      formData,
      "taskId"
    );

  const title =
    getText(
      formData,
      "title"
    );

  const description =
    optionalText(
      formData,
      "description"
    );

  const assignedTo =
    optionalText(
      formData,
      "assignedTo"
    );

  const dueDate =
    optionalText(
      formData,
      "dueDate"
    );

  const priority =
    getText(
      formData,
      "priority"
    );

  const errorPath =
    `/trips/${tripId}/tasks`;

  if (
    !taskId ||
    !title ||
    title.length >
      160
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Enter valid task details"
      )}`
    );
  }

  if (
    description &&
    description.length >
      1200
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Task description must be 1200 characters or fewer"
      )}`
    );
  }

  if (
    !isTaskPriority(
      priority
    )
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Choose a valid task priority"
      )}`
    );
  }

  if (
    !validDateInput(
      dueDate
    )
  ) {
    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        "Choose a valid due date"
      )}`
    );
  }

  const {
    data: updated,
    error: updateError,
  } = await supabase
    .from("trip_tasks")
    .update({
      title,

      description,

      assigned_to:
        assignedTo,

      due_date:
        dueDate,

      priority,
    })
    .eq(
      "id",
      taskId
    )
    .eq(
      "trip_id",
      tripId
    )
    .select("id")
    .maybeSingle();

  if (
    updateError ||
    !updated
  ) {
    console.error(
      "Failed to update trip task:",
      updateError
    );

    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        updateError?.message ??
          "Unable to update responsibility"
      )}`
    );
  }

  refreshTasks(
    tripId
  );

  replaceRedirect(
    `${errorPath}?success=${encodeURIComponent(
      "Responsibility updated"
    )}`
  );
}


export async function toggleTripTask(
  formData: FormData
) {
  const supabase =
    await createClient();

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

  const tripId =
    getText(
      formData,
      "tripId"
    );

  const taskId =
    getText(
      formData,
      "taskId"
    );

  const {
    data: task,
  } = await supabase
    .from("trip_tasks")
    .select(`
      id,
      status
    `)
    .eq(
      "id",
      taskId
    )
    .eq(
      "trip_id",
      tripId
    )
    .maybeSingle();

  if (!task) {
    replaceRedirect(
      `/trips/${tripId}/tasks`
    );
  }

  const nextStatus =
    task.status ===
    "completed"
      ? "open"
      : "completed";

  const {
    data: updated,
    error: updateError,
  } = await supabase
    .from("trip_tasks")
    .update({
      status:
        nextStatus,
    })
    .eq(
      "id",
      task.id
    )
    .select("id")
    .maybeSingle();

  if (
    updateError ||
    !updated
  ) {
    console.error(
      "Failed to change task status:",
      updateError
    );

    replaceRedirect(
      `/trips/${tripId}/tasks?error=${encodeURIComponent(
        updateError?.message ??
          "Unable to update responsibility"
      )}`
    );
  }

  refreshTasks(
    tripId
  );
}


export async function claimTripTask(
  formData: FormData
) {
  const supabase =
    await createClient();

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

  const userId =
    data.claims.sub;

  const tripId =
    getText(
      formData,
      "tripId"
    );

  const taskId =
    getText(
      formData,
      "taskId"
    );

  const {
    data: claimed,
    error: claimError,
  } = await supabase
    .from("trip_tasks")
    .update({
      assigned_to:
        userId,
    })
    .eq(
      "id",
      taskId
    )
    .eq(
      "trip_id",
      tripId
    )
    .is(
      "assigned_to",
      null
    )
    .eq(
      "status",
      "open"
    )
    .select("id")
    .maybeSingle();

  if (
    claimError ||
    !claimed
  ) {
    console.error(
      "Failed to claim trip task:",
      claimError
    );

    replaceRedirect(
      `/trips/${tripId}/tasks?error=${encodeURIComponent(
        claimError?.message ??
          "This responsibility could not be claimed"
      )}`
    );
  }

  refreshTasks(
    tripId
  );
}


export async function releaseTripTask(
  formData: FormData
) {
  const supabase =
    await createClient();

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

  const userId =
    data.claims.sub;

  const tripId =
    getText(
      formData,
      "tripId"
    );

  const taskId =
    getText(
      formData,
      "taskId"
    );

  const {
    data: released,
    error: releaseError,
  } = await supabase
    .from("trip_tasks")
    .update({
      assigned_to:
        null,
    })
    .eq(
      "id",
      taskId
    )
    .eq(
      "trip_id",
      tripId
    )
    .eq(
      "assigned_to",
      userId
    )
    .select("id")
    .maybeSingle();

  if (
    releaseError ||
    !released
  ) {
    console.error(
      "Failed to release trip task:",
      releaseError
    );

    replaceRedirect(
      `/trips/${tripId}/tasks?error=${encodeURIComponent(
        releaseError?.message ??
          "Unable to release responsibility"
      )}`
    );
  }

  refreshTasks(
    tripId
  );
}


export async function deleteTripTask(
  formData: FormData
) {
  const supabase =
    await createClient();

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

  const tripId =
    getText(
      formData,
      "tripId"
    );

  const taskId =
    getText(
      formData,
      "taskId"
    );

  const errorPath =
    `/trips/${tripId}/tasks`;

  const {
    error: deleteError,
  } = await supabase
    .from("trip_tasks")
    .delete()
    .eq(
      "id",
      taskId
    )
    .eq(
      "trip_id",
      tripId
    );

  if (deleteError) {
    console.error(
      "Failed to delete trip task:",
      deleteError
    );

    replaceRedirect(
      `${errorPath}?error=${encodeURIComponent(
        deleteError.message
      )}`
    );
  }

  refreshTasks(
    tripId
  );

  replaceRedirect(
    `${errorPath}?success=${encodeURIComponent(
      "Responsibility removed"
    )}`
  );
}