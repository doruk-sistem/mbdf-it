"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerSupabase } from '@/lib/clientSupabase';
import { uploadFile, deleteFile } from "@/lib/supabase";

// Get current user
async function getCurrentUser() {
  const supabase = createServerSupabase();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Unauthorized");
  }
  
  return user;
}

// Upload document
export async function uploadDocument(roomId: string, formData: FormData) {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();

  const file = formData.get("file") as File;
  const description = formData.get("description") as string;

  if (!file || file.size === 0) {
    throw new Error("File is required");
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("File size must be less than 10MB");
  }

  try {
    // Check if user is a member of the room
    const { data: member } = await supabase
      .from("mbdf_member")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      throw new Error("Must be a room member to upload documents");
    }

    // Generate unique file path
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}-${file.name}`;
    const filePath = `docs/${roomId}/${fileName}`;

    // Upload to Supabase Storage
    await uploadFile("docs", filePath, file, {
      contentType: file.type,
      metadata: {
        roomId,
        uploadedBy: user.id,
        originalName: file.name
      }
    });

    // Create document record
    const { data: document, error } = await supabase
      .from("document")
      .insert({
        room_id: roomId,
        name: file.name,
        description,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id
      })
      .select()
      .single();

    if (error) {
      // Clean up uploaded file if database insert fails
      await deleteFile("docs", filePath).catch(console.error);
      console.error("Document creation error:", error);
      throw new Error("Failed to create document record");
    }

    // Log the action
    await supabase
      .from("audit_log")
      .insert({
        room_id: roomId,
        user_id: user.id,
        action: "document_uploaded",
        resource_type: "document",
        resource_id: document.id,
        new_values: { name: file.name, file_size: file.size, mime_type: file.type }
      });

    revalidatePath(`/mbdf/${roomId}`);
  } catch (error) {
    console.error("Upload document error:", error);
    throw error;
  }
}

// Delete document
export async function deleteDocument(documentId: string) {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();

  try {
    // Get document details
    const { data: document } = await supabase
      .from("document")
      .select("room_id, file_path, name, uploaded_by")
      .eq("id", documentId)
      .single();

    if (!document) {
      throw new Error("Document not found");
    }

    // Check if user has permission to delete
    const { data: member } = await supabase
      .from("mbdf_member")
      .select("role")
      .eq("room_id", document.room_id)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      throw new Error("Not a room member");
    }

    // Only allow document uploader, LR, or admin to delete
    const canDelete = document.uploaded_by === user.id || 
                     member.role === "admin" || 
                     member.role === "lr";

    if (!canDelete) {
      throw new Error("Insufficient permissions to delete this document");
    }

    // Delete from storage
    try {
      await deleteFile("docs", document.file_path);
    } catch (storageError) {
      console.error("Storage deletion error:", storageError);
      // Continue with database deletion even if storage fails
    }

    // Delete from database
    const { error } = await supabase
      .from("document")
      .delete()
      .eq("id", documentId);

    if (error) {
      console.error("Document deletion error:", error);
      throw new Error("Failed to delete document");
    }

    // Log the action
    await supabase
      .from("audit_log")
      .insert({
        room_id: document.room_id,
        user_id: user.id,
        action: "document_deleted",
        resource_type: "document",
        resource_id: documentId,
        old_values: { name: document.name, file_path: document.file_path }
      });

    revalidatePath(`/mbdf/${document.room_id}`);
  } catch (error) {
    console.error("Delete document error:", error);
    throw error;
  }
}

// Update document
export async function updateDocument(documentId: string, formData: FormData) {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  if (!name) {
    throw new Error("Document name is required");
  }

  try {
    // Get document details
    const { data: document } = await supabase
      .from("document")
      .select("room_id, uploaded_by")
      .eq("id", documentId)
      .single();

    if (!document) {
      throw new Error("Document not found");
    }

    // Check if user has permission to update
    const { data: member } = await supabase
      .from("mbdf_member")
      .select("role")
      .eq("room_id", document.room_id)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      throw new Error("Not a room member");
    }

    // Only allow document uploader, LR, or admin to update
    const canUpdate = document.uploaded_by === user.id || 
                     member.role === "admin" || 
                     member.role === "lr";

    if (!canUpdate) {
      throw new Error("Insufficient permissions to update this document");
    }

    // Update document
    const { error } = await supabase
      .from("document")
      .update({
        name,
        description,
        updated_at: new Date().toISOString()
      })
      .eq("id", documentId);

    if (error) {
      console.error("Document update error:", error);
      throw new Error("Failed to update document");
    }

    // Log the action
    await supabase
      .from("audit_log")
      .insert({
        room_id: document.room_id,
        user_id: user.id,
        action: "document_updated",
        resource_type: "document",
        resource_id: documentId,
        new_values: { name, description }
      });

    revalidatePath(`/mbdf/${document.room_id}`);
  } catch (error) {
    console.error("Update document error:", error);
    throw error;
  }
}