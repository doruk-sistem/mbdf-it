"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';
import type { Database } from "@/types/supabase";

type Room = Database['public']['Tables']['mbdf_room']['Row'];
type RoomInsert = Database['public']['Tables']['mbdf_room']['Insert'];
type RoomUpdate = Database['public']['Tables']['mbdf_room']['Update'];


// Get current user
async function getCurrentUser() {
  const supabase = createServerSupabase();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Unauthorized");
  }
  
  return user;
}

// Check membership using admin client to avoid RLS issues
async function checkMembership(roomId: string, userId: string) {
  const adminSupabase = createAdminSupabase();
  
  const { data: membership } = await adminSupabase
    .from("mbdf_member")
    .select("role")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .single() as { data: any; error: any };
    
  return membership;
}

// Get room status using admin client to avoid RLS issues
async function getRoomStatus(roomId: string) {
  const adminSupabase = createAdminSupabase();
  const { data: room } = await adminSupabase
    .from("mbdf_room")
    .select("status")
    .eq("id", roomId)
    .single() as { data: { status: Database['public']['Enums']['room_status'] } | null } as any;
  return room?.status;
}

// Create a new MBDF room
export async function createRoom(formData: FormData) {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const substanceId = formData.get("substanceId") as string;

  if (!name || !substanceId) {
    throw new Error("Name and substance are required");
  }

  try {
    // Create the room
    const { data: room, error: roomError } = await supabase
      .from("mbdf_room")
      .insert({
        name,
        description,
        substance_id: substanceId,
        created_by: user.id,
        status: "active"
      })
      .select()
      .single();

    if (roomError) {
      console.error("Room creation error:", roomError);
      throw new Error("Failed to create room");
    }

    // Add creator as admin member
    const { error: memberError } = await supabase
      .from("mbdf_member")
      .insert({
        room_id: room.id,
        user_id: user.id,
        role: "admin"
      });

    if (memberError) {
      console.error("Member creation error:", memberError);
      // Don't fail completely if member creation fails
    }

    // Log the action
    await supabase
      .from("audit_log")
      .insert({
        room_id: room.id,
        user_id: user.id,
        action: "room_created",
        resource_type: "mbdf_room",
        resource_id: room.id,
        new_values: { name, description, substance_id: substanceId }
      });

    revalidatePath("/");
    redirect(`/mbdf/${room.id}`);
  } catch (error) {
    console.error("Create room error:", error);
    throw new Error("Failed to create room");
  }
}

// Update room
export async function updateRoom(roomId: string, formData: FormData) {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const status = formData.get("status") as string;

  if (!name) {
    throw new Error("Name is required");
  }

  try {
    // Check if user has permission to update room
    const member = await checkMembership(roomId, user.id);

    if (!member || (member.role !== "admin" && member.role !== "lr")) {
      throw new Error("Insufficient permissions");
    }

    // Get old values for audit
    const { data: oldRoom } = await supabase
      .from("mbdf_room")
      .select("name, description, status")
      .eq("id", roomId)
      .single();

    // Update room
    const { error } = await supabase
      .from("mbdf_room")
      .update({
        name,
        description,
        status: status as Database['public']['Enums']['room_status'],
        updated_at: new Date().toISOString()
      })
      .eq("id", roomId);

    if (error) {
      console.error("Room update error:", error);
      throw new Error("Failed to update room");
    }

    // Log the action
    await supabase
      .from("audit_log")
      .insert({
        room_id: roomId,
        user_id: user.id,
        action: "room_updated",
        resource_type: "mbdf_room",
        resource_id: roomId,
        old_values: oldRoom,
        new_values: { name, description, status }
      });

    revalidatePath(`/mbdf/${roomId}`);
  } catch (error) {
    console.error("Update room error:", error);
    throw new Error("Failed to update room");
  }
}

// Join room
export async function joinRoom(roomId: string) {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();

  try {
    // Block if room is archived
    const status = await getRoomStatus(roomId);
    if (status === 'archived') {
      throw new Error("Room is archived. Membership changes are disabled");
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("mbdf_member")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (existingMember) {
      throw new Error("Already a member of this room");
    }

    // Add user as member
    const { error } = await supabase
      .from("mbdf_member")
      .insert({
        room_id: roomId,
        user_id: user.id,
        role: "member"
      });

    if (error) {
      console.error("Join room error:", error);
      throw new Error("Failed to join room");
    }

    // Log the action
    await supabase
      .from("audit_log")
      .insert({
        room_id: roomId,
        user_id: user.id,
        action: "room_joined",
        resource_type: "mbdf_member",
        new_values: { room_id: roomId, user_id: user.id, role: "member" }
      });

    revalidatePath(`/mbdf/${roomId}`);
  } catch (error) {
    console.error("Join room error:", error);
    throw new Error("Failed to join room");
  }
}

// Leave room
export async function leaveRoom(roomId: string) {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();

  try {
    // Get member info
    const { data: member } = await supabase
      .from("mbdf_member")
      .select("id, role")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      throw new Error("Not a member of this room");
    }

    // Don't allow room creator to leave if they're the only admin
    if (member.role === "admin") {
      const { count } = await supabase
        .from("mbdf_member")
        .select("*", { count: "exact", head: true })
        .eq("room_id", roomId)
        .eq("role", "admin");

      if (count === 1) {
        throw new Error("Cannot leave room as the only administrator");
      }
    }

    // Remove membership
    const { error } = await supabase
      .from("mbdf_member")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Leave room error:", error);
      throw new Error("Failed to leave room");
    }

    // Log the action
    await supabase
      .from("audit_log")
      .insert({
        room_id: roomId,
        user_id: user.id,
        action: "room_left",
        resource_type: "mbdf_member",
        old_values: { room_id: roomId, user_id: user.id, role: member.role }
      });

    revalidatePath(`/mbdf/${roomId}`);
    redirect("/");
  } catch (error) {
    console.error("Leave room error:", error);
    throw new Error("Failed to leave room");
  }
}

// Add member to room
export async function addMemberToRoom(roomId: string, userEmail: string, role: string = "member") {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();

  try {
    // Block if room is archived
    const status = await getRoomStatus(roomId);
    if (status === 'archived') {
      throw new Error("Room is archived. Membership changes are disabled");
    }

    // Check if current user has permission to add members
    const { data: member } = await supabase
      .from("mbdf_member")
      .select("role")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!member || (member.role !== "admin" && member.role !== "lr")) {
      throw new Error("Insufficient permissions");
    }

    // LR can only add members with "member" role
    if (member.role === "lr" && role !== "member") {
      throw new Error("LR can only add members with 'member' role");
    }

    // Find user by email
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", userEmail)
      .single();

    if (!targetProfile) {
      throw new Error("User not found");
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("mbdf_member")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", targetProfile.id)
      .single();

    if (existingMember) {
      throw new Error("User is already a member of this room");
    }

    // Add user as member
    const { error } = await supabase
      .from("mbdf_member")
      .insert({
        room_id: roomId,
        user_id: targetProfile.id,
        role: role as Database['public']['Enums']['user_role']
      });

    if (error) {
      console.error("Add member error:", error);
      throw new Error("Failed to add member");
    }

    // Log the action
    await supabase
      .from("audit_log")
      .insert({
        room_id: roomId,
        user_id: user.id,
        action: "member_added",
        resource_type: "mbdf_member",
        new_values: { room_id: roomId, user_id: targetProfile.id, role, added_by: user.id }
      });

    revalidatePath(`/mbdf/${roomId}`);
  } catch (error) {
    console.error("Add member error:", error);
    throw new Error("Failed to add member");
  }
}

// Remove member from room
export async function removeMemberFromRoom(roomId: string, memberId: string) {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();

  try {
    // Block if room is archived
    const status = await getRoomStatus(roomId);
    if (status === 'archived') {
      throw new Error("Room is archived. Membership changes are disabled");
    }

    // Check if current user has permission to remove members
    const { data: currentMember } = await supabase
      .from("mbdf_member")
      .select("role")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!currentMember || !['admin', 'lr'].includes(currentMember.role)) {
      throw new Error("Insufficient permissions");
    }

    // Get member to be removed
    const { data: targetMember } = await supabase
      .from("mbdf_member")
      .select("user_id, role")
      .eq("room_id", roomId)
      .eq("id", memberId)
      .single();

    if (!targetMember) {
      throw new Error("Member not found");
    }

    // Don't allow removing the room creator if they're the only admin
    if (targetMember.role === "admin") {
      const { count } = await supabase
        .from("mbdf_member")
        .select("*", { count: "exact", head: true })
        .eq("room_id", roomId)
        .eq("role", "admin");

      if (count === 1) {
        throw new Error("Cannot remove the only administrator");
      }
    }

    // Remove member
    const { error } = await supabase
      .from("mbdf_member")
      .delete()
      .eq("id", memberId);

    if (error) {
      console.error("Remove member error:", error);
      throw new Error("Failed to remove member");
    }

    // Log the action
    await supabase
      .from("audit_log")
      .insert({
        room_id: roomId,
        user_id: user.id,
        action: "member_removed",
        resource_type: "mbdf_member",
        old_values: { room_id: roomId, user_id: targetMember.user_id, role: targetMember.role }
      });

    revalidatePath(`/mbdf/${roomId}`);
  } catch (error) {
    console.error("Remove member error:", error);
    throw new Error("Failed to remove member");
  }
}


// Get room members with details
export async function getRoomMembers(roomId: string) {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();
  const adminSupabase = createAdminSupabase();

  try {
    // Check if user is a member of the room using admin client to ensure we get the correct role
    const { data: membership } = await adminSupabase
      .from("mbdf_member")
      .select("role")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single() as { data: { role: Database['public']['Enums']['user_role'] } | null };

    // Allow non-members to view members, but with limited role
    const currentUserRole = membership?.role || null;

    // Get all members with profile and company data using admin client
    const { data: members, error } = await adminSupabase
      .from("mbdf_member")
      .select(`
        id,
        user_id,
        role,
        joined_at,
        profiles:user_id (
          id,
          full_name,
          email,
          avatar_url,
          company:company_id (
            name,
            vat_number
          )
        )
      `)
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("Get room members error:", error);
      throw new Error("Failed to get room members");
    }

    return { members: members || [], currentUserRole, currentUserId: user.id };
  } catch (error) {
    console.error("Get room members error:", error);
    throw new Error("Failed to get room members");
  }
}