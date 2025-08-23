"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase";
import { sendAccessRequestNotification, sendAccessApprovedNotification, sendAccessRejectedNotification } from "@/lib/email";
import { generateTimestampHash } from "@/lib/kks/hash";


// Get current user
async function getCurrentUser() {
  const supabase = createServerSupabase();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Unauthorized");
  }
  
  return user;
}

// Create access package
export async function createAccessPackage(roomId: string, formData: FormData) {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const packageData = formData.get("packageData") as string;

  if (!name) {
    throw new Error("Package name is required");
  }

  try {
    // Check if user has permission to create packages
    const { data: member } = await supabase
      .from("mbdf_member")
      .select("role")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!member || (member.role !== "admin" && member.role !== "lr")) {
      throw new Error("Insufficient permissions");
    }

    let parsedData = null;
    if (packageData) {
      try {
        parsedData = JSON.parse(packageData);
      } catch {
        throw new Error("Invalid JSON in package data");
      }
    }

    // Create package
    const { data: pkg, error } = await supabase
      .from("access_package")
      .insert({
        room_id: roomId,
        name,
        description,
        package_data: parsedData,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error("Package creation error:", error);
      throw new Error("Failed to create package");
    }

    // Log the action
    await supabase
      .from("audit_log")
      .insert({
        room_id: roomId,
        user_id: user.id,
        action: "package_created",
        resource_type: "access_package",
        resource_id: pkg.id,
        new_values: { name, description }
      });

    revalidatePath(`/mbdf/${roomId}`);
  } catch (error) {
    console.error("Create package error:", error);
    throw error;
  }
}

// Update access package
export async function updateAccessPackage(packageId: string, formData: FormData) {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const packageData = formData.get("packageData") as string;

  if (!name) {
    throw new Error("Package name is required");
  }

  try {
    // Get package and check permissions
    const { data: pkg } = await supabase
      .from("access_package")
      .select("room_id")
      .eq("id", packageId)
      .single();

    if (!pkg) {
      throw new Error("Package not found");
    }

    const { data: member } = await supabase
      .from("mbdf_member")
      .select("role")
      .eq("room_id", pkg.room_id)
      .eq("user_id", user.id)
      .single();

    if (!member || (member.role !== "admin" && member.role !== "lr")) {
      throw new Error("Insufficient permissions");
    }

    let parsedData = null;
    if (packageData) {
      try {
        parsedData = JSON.parse(packageData);
      } catch {
        throw new Error("Invalid JSON in package data");
      }
    }

    // Update package
    const { error } = await supabase
      .from("access_package")
      .update({
        name,
        description,
        package_data: parsedData,
        updated_at: new Date().toISOString()
      })
      .eq("id", packageId);

    if (error) {
      console.error("Package update error:", error);
      throw new Error("Failed to update package");
    }

    // Log the action
    await supabase
      .from("audit_log")
      .insert({
        room_id: pkg.room_id,
        user_id: user.id,
        action: "package_updated",
        resource_type: "access_package",
        resource_id: packageId,
        new_values: { name, description }
      });

    revalidatePath(`/mbdf/${pkg.room_id}`);
  } catch (error) {
    console.error("Update package error:", error);
    throw error;
  }
}

// Create access request
export async function createAccessRequest(packageId: string, justification: string) {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();

  if (!justification.trim()) {
    throw new Error("Justification is required");
  }

  try {
    // Get package and room info
    const { data: pkg } = await supabase
      .from("access_package")
      .select(`
        room_id,
        name,
        mbdf_room!inner(name)
      `)
      .eq("id", packageId)
      .single();

    if (!pkg) {
      throw new Error("Package not found");
    }

    // Check if user is a member of the room
    const { data: member } = await supabase
      .from("mbdf_member")
      .select("id")
      .eq("room_id", pkg.room_id)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      throw new Error("Must be a room member to request access");
    }

    // Check if user already has a pending request
    const { data: existingRequest } = await supabase
      .from("access_request")
      .select("id, status")
      .eq("package_id", packageId)
      .eq("requester_id", user.id)
      .single();

    if (existingRequest?.status === "pending") {
      throw new Error("You already have a pending request for this package");
    }

    // Create access request
    const { data: request, error } = await supabase
      .from("access_request")
      .insert({
        package_id: packageId,
        requester_id: user.id,
        justification,
        status: "pending"
      })
      .select(`
        id,
        profiles!access_request_requester_id_fkey(full_name)
      `)
      .single();

    if (error) {
      console.error("Access request creation error:", error);
      throw new Error("Failed to create access request");
    }

    // Get LR/Admin emails for notification
    const { data: lrMembers } = await supabase
      .from("mbdf_member")
      .select("profiles!mbdf_member_user_id_fkey(email)")
      .eq("room_id", pkg.room_id)
      .in("role", ["admin", "lr"]);

    const lrEmails = lrMembers?.map(m => (m.profiles as any)?.email).filter(Boolean) || [];

    // Send notification emails
    if (lrEmails.length > 0) {
      try {
        await sendAccessRequestNotification(
          lrEmails,
          (request.profiles as any)?.full_name || "Unknown User",
          pkg.name,
          (pkg.mbdf_room as any)?.name
        );
      } catch (emailError) {
        console.error("Failed to send notification email:", emailError);
        // Don't fail the request creation if email fails
      }
    }

    // Log the action
    await supabase
      .from("audit_log")
      .insert({
        room_id: pkg.room_id,
        user_id: user.id,
        action: "access_request_created",
        resource_type: "access_request",
        resource_id: request.id,
        new_values: { package_id: packageId, justification }
      });

    revalidatePath(`/mbdf/${pkg.room_id}`);
  } catch (error) {
    console.error("Create access request error:", error);
    throw error;
  }
}

// Approve access request
export async function approveAccessRequest(requestId: string) {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();

  try {
    // Get request details
    const { data: request } = await supabase
      .from("access_request")
      .select(`
        id,
        status,
        access_package!inner(room_id, name),
        profiles!access_request_requester_id_fkey(full_name, email),
        mbdf_room:access_package(mbdf_room!inner(name))
      `)
      .eq("id", requestId)
      .single();

    if (!request) {
      throw new Error("Request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Request is not pending");
    }

    // Check if user has permission to approve
    const { data: member } = await supabase
      .from("mbdf_member")
      .select("role")
      .eq("room_id", (request.access_package as any)?.room_id)
      .eq("user_id", user.id)
      .single();

    if (!member || (member.role !== "admin" && member.role !== "lr")) {
      throw new Error("Insufficient permissions");
    }

    // Generate access token
    const accessToken = generateTimestampHash();

    // Approve request
    const { error } = await supabase
      .from("access_request")
      .update({
        status: "approved",
        access_token: accessToken,
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq("id", requestId);

    if (error) {
      console.error("Approve request error:", error);
      throw new Error("Failed to approve request");
    }

    // Send approval email to requester
    try {
      await sendAccessApprovedNotification(
        (request.profiles as any)?.email,
        (request.profiles as any)?.full_name || "Unknown User",
        (request.access_package as any)?.name,
        (request as any)?.mbdf_room?.[0]?.mbdf_room?.name,
        accessToken
      );
    } catch (emailError) {
      console.error("Failed to send approval email:", emailError);
      // Don't fail the approval if email fails
    }

    // Log the action
    await supabase
      .from("audit_log")
      .insert({
        room_id: (request.access_package as any)?.room_id,
        user_id: user.id,
        action: "access_request_approved",
        resource_type: "access_request",
        resource_id: requestId,
        new_values: { approved_by: user.id, access_token: accessToken }
      });

    revalidatePath(`/mbdf/${(request.access_package as any)?.room_id}`);
  } catch (error) {
    console.error("Approve request error:", error);
    throw error;
  }
}

// Reject access request
export async function rejectAccessRequest(requestId: string, reason?: string) {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();

  try {
    // Get request details
    const { data: request } = await supabase
      .from("access_request")
      .select(`
        id,
        status,
        access_package!inner(room_id, name),
        profiles!access_request_requester_id_fkey(full_name, email),
        mbdf_room:access_package(mbdf_room!inner(name))
      `)
      .eq("id", requestId)
      .single();

    if (!request) {
      throw new Error("Request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Request is not pending");
    }

    // Check if user has permission to reject
    const { data: member } = await supabase
      .from("mbdf_member")
      .select("role")
      .eq("room_id", (request.access_package as any)?.room_id)
      .eq("user_id", user.id)
      .single();

    if (!member || (member.role !== "admin" && member.role !== "lr")) {
      throw new Error("Insufficient permissions");
    }

    // Reject request
    const { error } = await supabase
      .from("access_request")
      .update({
        status: "rejected",
        rejected_reason: reason || "No reason provided",
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq("id", requestId);

    if (error) {
      console.error("Reject request error:", error);
      throw new Error("Failed to reject request");
    }

    // Send rejection email to requester
    try {
      await sendAccessRejectedNotification(
        (request.profiles as any)?.email,
        (request.profiles as any)?.full_name || "Unknown User",
        (request.access_package as any)?.name,
        (request as any)?.mbdf_room?.[0]?.mbdf_room?.name,
        reason
      );
    } catch (emailError) {
      console.error("Failed to send rejection email:", emailError);
      // Don't fail the rejection if email fails
    }

    // Log the action
    await supabase
      .from("audit_log")
      .insert({
        room_id: (request.access_package as any)?.room_id,
        user_id: user.id,
        action: "access_request_rejected",
        resource_type: "access_request",
        resource_id: requestId,
        new_values: { approved_by: user.id, rejected_reason: reason }
      });

    revalidatePath(`/mbdf/${(request.access_package as any)?.room_id}`);
  } catch (error) {
    console.error("Reject request error:", error);
    throw error;
  }
}