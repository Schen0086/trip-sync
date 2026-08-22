"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createGroup(
  formData: FormData
) {
  const supabase = await createClient();

  // Check authentication
  const { data, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !data?.claims) {
    redirect("/login");
  }

  const userId = data.claims.sub;

  // Read form data
  const name =
    (formData.get("name") as string)?.trim();

  const description =
    (formData.get("description") as string)?.trim();

  const requestedRedirect =
    formData.get("redirectTo") as string;

  // Restrict redirect
  const redirectTo =
    requestedRedirect === "/trips/new/group"
      ? "/trips/new/group"
      : "/groups";

  // Validate group
  if (!name) {
    redirect(
      `${redirectTo}?error=${encodeURIComponent(
        "Group name is required"
      )}`
    );
  }

  if (name.length > 60) {
    redirect(
      `${redirectTo}?error=${encodeURIComponent(
        "Group name must be 60 characters or fewer"
      )}`
    );
  }

  // Create group
  const { error } = await supabase
    .from("groups")
    .insert({
      name,
      description: description || null,
      created_by: userId,
    });

  if (error) {
    console.error(
      "Failed to create group:",
      error
    );

    redirect(
      `${redirectTo}?error=${encodeURIComponent(
        "Unable to create group"
      )}`
    );
  }

  // Refresh pages
  revalidatePath("/groups");
  revalidatePath("/trips/new/group");

  redirect(redirectTo);
}

export async function joinGroupByCode(
  formData: FormData
) {
  const supabase = await createClient();

  // Check authentication
  const { data, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !data?.claims) {
    redirect("/login");
  }

  // Read code
  const code =
    (formData.get("code") as string)
      ?.trim()
      .toUpperCase();

  if (!code) {
    redirect(
      `/groups?error=${encodeURIComponent(
        "Group code is required"
      )}`
    );
  }

  // Join group
  const { data: groupId, error } =
    await supabase.rpc(
      "join_group_by_code",
      {
        supplied_code: code,
      }
    );

  if (error || !groupId) {
    console.error(
      "Failed to join group:",
      error
    );

    redirect(
      `/groups?error=${encodeURIComponent(
        error?.message ??
          "Unable to join group"
      )}`
    );
  }

  // Refresh pages
  revalidatePath("/groups");
  revalidatePath("/dashboard");

  redirect(
    `/groups/${groupId}?success=${encodeURIComponent(
      "You joined the group"
    )}`
  );
}

export async function updateGroup(
  formData: FormData
) {
  const supabase = await createClient();

  // Check authentication
  const { data, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !data?.claims) {
    redirect("/login");
  }

  // Read form data
  const groupId =
    formData.get("groupId") as string;

  const name =
    (formData.get("name") as string)?.trim();

  const description =
    (formData.get("description") as string)?.trim();

  if (!groupId || !name) {
    redirect("/groups");
  }

  if (name.length > 60) {
    redirect(
      `/groups/${groupId}?error=${encodeURIComponent(
        "Group name must be 60 characters or fewer"
      )}`
    );
  }

  // Update group
  const { data: updatedGroup, error } =
    await supabase
      .from("groups")
      .update({
        name,
        description: description || null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", groupId)
      .select("id")
      .maybeSingle();

  if (error || !updatedGroup) {
    console.error(
      "Failed to update group:",
      error
    );

    redirect(
      `/groups/${groupId}?error=${encodeURIComponent(
        "Unable to update group"
      )}`
    );
  }

  // Refresh pages
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  revalidatePath("/dashboard");

  redirect(
    `/groups/${groupId}?success=${encodeURIComponent(
      "Group updated"
    )}`
  );
}

export async function addGroupMember(
  formData: FormData
) {
  const supabase = await createClient();

  // Check authentication
  const { data, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !data?.claims) {
    redirect("/login");
  }

  // Read form data
  const groupId =
    formData.get("groupId") as string;

  const email =
    (formData.get("email") as string)
      ?.trim()
      .toLowerCase();

  if (!groupId || !email) {
    redirect(
      `/groups/${groupId}?error=${encodeURIComponent(
        "Email is required"
      )}`
    );
  }

  // Add member
  const { error } = await supabase.rpc(
    "add_group_member_by_email",
    {
      target_group_id: groupId,
      target_email: email,
    }
  );

  if (error) {
    console.error(
      "Failed to add member:",
      error
    );

    redirect(
      `/groups/${groupId}?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  // Refresh group
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");

  redirect(
    `/groups/${groupId}?success=${encodeURIComponent(
      "Member added"
    )}`
  );
}

export async function regenerateGroupCode(
  formData: FormData
) {
  const supabase = await createClient();

  // Check authentication
  const { data, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !data?.claims) {
    redirect("/login");
  }

  const groupId =
    formData.get("groupId") as string;

  if (!groupId) {
    redirect("/groups");
  }

  // Regenerate code
  const { error } = await supabase.rpc(
    "regenerate_group_code",
    {
      target_group_id: groupId,
    }
  );

  if (error) {
    console.error(
      "Failed to regenerate code:",
      error
    );

    redirect(
      `/groups/${groupId}?error=${encodeURIComponent(
        "Unable to regenerate group code"
      )}`
    );
  }

  // Refresh group
  revalidatePath(`/groups/${groupId}`);

  redirect(
    `/groups/${groupId}?success=${encodeURIComponent(
      "New group code generated"
    )}`
  );
}

export async function updateMemberRole(
  formData: FormData
) {
  const supabase = await createClient();

  // Check authentication
  const { data, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !data?.claims) {
    redirect("/login");
  }

  // Read form data
  const groupId =
    formData.get("groupId") as string;

  const userId =
    formData.get("userId") as string;

  const role =
    formData.get("role") as string;

  if (
    !groupId ||
    !userId ||
    (role !== "admin" &&
      role !== "member")
  ) {
    redirect(
      `/groups/${groupId}?error=${encodeURIComponent(
        "Invalid member role"
      )}`
    );
  }

  // Update role
  const { data: updatedMember, error } =
    await supabase
      .from("group_members")
      .update({
        role,
      })
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .select("user_id")
      .maybeSingle();

  if (error || !updatedMember) {
    console.error(
      "Failed to update member:",
      error
    );

    redirect(
      `/groups/${groupId}?error=${encodeURIComponent(
        "Unable to update member role"
      )}`
    );
  }

  // Refresh group
  revalidatePath(`/groups/${groupId}`);

  redirect(
    `/groups/${groupId}?success=${encodeURIComponent(
      "Member role updated"
    )}`
  );
}

export async function removeGroupMember(
  formData: FormData
) {
  const supabase = await createClient();

  // Check authentication
  const { data, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !data?.claims) {
    redirect("/login");
  }

  // Read form data
  const groupId =
    formData.get("groupId") as string;

  const userId =
    formData.get("userId") as string;

  if (!groupId || !userId) {
    redirect("/groups");
  }

  // Remove member
  const { data: removedMember, error } =
    await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .select("user_id")
      .maybeSingle();

  if (error || !removedMember) {
    console.error(
      "Failed to remove member:",
      error
    );

    redirect(
      `/groups/${groupId}?error=${encodeURIComponent(
        "Unable to remove member"
      )}`
    );
  }

  // Refresh pages
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  revalidatePath("/dashboard");

  redirect(
    `/groups/${groupId}?success=${encodeURIComponent(
      "Member removed"
    )}`
  );
}

export async function leaveGroup(
  formData: FormData
) {
  const supabase = await createClient();

  // Check authentication
  const { data, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !data?.claims) {
    redirect("/login");
  }

  const userId = data.claims.sub;

  const groupId =
    formData.get("groupId") as string;

  if (!groupId) {
    redirect("/groups");
  }

  // Leave group
  const { data: removedMembership, error } =
    await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .select("user_id")
      .maybeSingle();

  if (error || !removedMembership) {
    console.error(
      "Failed to leave group:",
      error
    );

    redirect(
      `/groups/${groupId}?error=${encodeURIComponent(
        "Unable to leave group"
      )}`
    );
  }

  // Refresh pages
  revalidatePath("/groups");
  revalidatePath("/dashboard");

  redirect(
    `/groups?success=${encodeURIComponent(
      "You left the group"
    )}`
  );
}

export async function setGroupStatus(
  formData: FormData
) {
  const supabase = await createClient();

  // Check authentication
  const { data, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !data?.claims) {
    redirect("/login");
  }

  const groupId =
    formData.get("groupId") as string;

  const status =
    formData.get("status") as string;

  if (
    !groupId ||
    (status !== "active" &&
      status !== "closed")
  ) {
    redirect("/groups");
  }

  // Change status
  const { data: updatedGroup, error } =
    await supabase
      .from("groups")
      .update({
        status,
        closed_at:
          status === "closed"
            ? new Date().toISOString()
            : null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", groupId)
      .select("id, status")
      .maybeSingle();

  if (error || !updatedGroup) {
    console.error(
      "Failed to change group status:",
      error
    );

    redirect(
      `/groups/${groupId}?error=${encodeURIComponent(
        "Unable to change group status"
      )}`
    );
  }

  // Refresh pages
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  revalidatePath("/trips/new/group");

  redirect(
    `/groups/${groupId}?success=${encodeURIComponent(
      status === "closed"
        ? "Group closed"
        : "Group reopened"
    )}`
  );
}

export async function deleteGroup(
  formData: FormData
) {
  const supabase = await createClient();

  // Check authentication
  const { data, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !data?.claims) {
    redirect("/login");
  }

  const groupId =
    formData.get("groupId") as string;

  if (!groupId) {
    redirect("/groups");
  }

  // Delete group
  const { data: deletedGroup, error } =
    await supabase
      .from("groups")
      .delete()
      .eq("id", groupId)
      .select("id")
      .maybeSingle();

  if (error || !deletedGroup) {
    console.error(
      "Failed to delete group:",
      error
    );

    redirect(
      `/groups/${groupId}?error=${encodeURIComponent(
        "Unable to delete group"
      )}`
    );
  }

  // Refresh pages
  revalidatePath("/groups");
  revalidatePath("/dashboard");
  revalidatePath("/trips/new/group");

  redirect(
    `/groups?success=${encodeURIComponent(
      "Group deleted"
    )}`
  );
}