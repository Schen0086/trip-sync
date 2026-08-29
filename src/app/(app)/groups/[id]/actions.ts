"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

export async function transferGroupOwnership(
  formData: FormData
) {
  const supabase =
    await createClient();

  const {
    data,
    error: authError,
  } =
    await supabase.auth.getClaims();

  if (
    authError ||
    !data?.claims
  ) {
    redirect("/login");
  }

  const groupId =
    formData.get(
      "groupId"
    ) as string;

  const newOwnerUserId =
    formData.get(
      "newOwnerUserId"
    ) as string;

  if (
    !groupId ||
    !newOwnerUserId
  ) {
    redirect("/groups");
  }

  const {
    error,
  } = await supabase.rpc(
    "transfer_group_ownership",
    {
      target_group_id:
        groupId,

      new_owner_user_id:
        newOwnerUserId,
    }
  );

  if (error) {
    console.error(
      "Failed to transfer group ownership:",
      error
    );

    redirect(
      `/groups/${groupId}?error=${encodeURIComponent(
        error.message ||
          "Unable to transfer group ownership"
      )}`
    );
  }

  revalidatePath(
    `/groups/${groupId}`
  );

  revalidatePath(
    "/groups"
  );

  revalidatePath(
    "/dashboard"
  );

  revalidatePath(
    "/trips/new/group"
  );

  redirect(
    `/groups/${groupId}?success=${encodeURIComponent(
      "Group ownership transferred. You are now an admin."
    )}`
  );
}