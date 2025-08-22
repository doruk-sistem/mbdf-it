"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from '@/lib/clientSupabase';


// Get current user
async function getCurrentUser() {
  const supabase = createServerSupabase();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Unauthorized");
  }
  
  return user;
}

// Nominate LR candidate
export async function nominateLRCandidate(roomId: string, candidateUserId: string) {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();

  try {
    // Check if user is a member of the room
    const { data: member } = await supabase
      .from("mbdf_member")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      throw new Error("Must be a room member to nominate candidates");
    }

    // Check if candidate is a member of the room
    const { data: candidateMember } = await supabase
      .from("mbdf_member")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", candidateUserId)
      .single();

    if (!candidateMember) {
      throw new Error("Candidate must be a room member");
    }

    // Check if already nominated
    const { data: existingCandidate } = await supabase
      .from("lr_candidate")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", candidateUserId)
      .single();

    if (existingCandidate) {
      throw new Error("User is already a candidate");
    }

    // Create candidate
    const { data: candidate, error } = await supabase
      .from("lr_candidate")
      .insert({
        room_id: roomId,
        user_id: candidateUserId,
        is_selected: false
      })
      .select()
      .single();

    if (error) {
      console.error("Candidate creation error:", error);
      throw new Error("Failed to nominate candidate");
    }

    // Log the action
    await supabase
      .from("audit_log")
      .insert({
        room_id: roomId,
        user_id: user.id,
        action: "lr_candidate_nominated",
        resource_type: "lr_candidate",
        resource_id: candidate.id,
        new_values: { candidate_user_id: candidateUserId, nominated_by: user.id }
      });

    revalidatePath(`/mbdf/${roomId}`);
  } catch (error) {
    console.error("Nominate candidate error:", error);
    throw error;
  }
}

// Submit LR vote
export async function submitLRVote(
  roomId: string,
  candidateId: string,
  scores: {
    technical: number;
    experience: number;
    availability: number;
    communication: number;
    leadership: number;
  }
) {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();

  // Validate scores
  const scoreValues = Object.values(scores);
  if (scoreValues.some(score => score < 0 || score > 5)) {
    throw new Error("All scores must be between 0 and 5");
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
      throw new Error("Must be a room member to vote");
    }

    // Verify candidate exists in the room
    const { data: candidate } = await supabase
      .from("lr_candidate")
      .select("id")
      .eq("room_id", roomId)
      .eq("id", candidateId)
      .single();

    if (!candidate) {
      throw new Error("Candidate not found in this room");
    }

    // Check if LR is already selected (voting closed)
    const { data: selectedCandidate } = await supabase
      .from("lr_candidate")
      .select("id")
      .eq("room_id", roomId)
      .eq("is_selected", true)
      .single();

    if (selectedCandidate) {
      throw new Error("Voting is closed - LR has already been selected");
    }

    // Upsert vote (update if exists, insert if not)
    const { data: vote, error } = await supabase
      .from("lr_vote")
      .upsert({
        room_id: roomId,
        voter_id: user.id,
        candidate_id: candidateId,
        technical_score: scores.technical,
        experience_score: scores.experience,
        availability_score: scores.availability,
        communication_score: scores.communication,
        leadership_score: scores.leadership
      }, {
        onConflict: "room_id,voter_id,candidate_id"
      })
      .select()
      .single();

    if (error) {
      console.error("Vote submission error:", error);
      throw new Error("Failed to submit vote");
    }

    // Log the action
    await supabase
      .from("audit_log")
      .insert({
        room_id: roomId,
        user_id: user.id,
        action: "lr_vote_submitted",
        resource_type: "lr_vote",
        resource_id: vote.id,
        new_values: { candidate_id: candidateId, scores }
      });

    revalidatePath(`/mbdf/${roomId}`);
  } catch (error) {
    console.error("Submit vote error:", error);
    throw error;
  }
}

// Finalize LR selection
export async function finalizeLRSelection(roomId: string, candidateId: string) {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();

  try {
    // Check if user has permission to finalize selection
    const { data: member } = await supabase
      .from("mbdf_member")
      .select("role")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!member || member.role !== "admin") {
      throw new Error("Only room administrators can finalize LR selection");
    }

    // Verify candidate exists in the room
    const { data: candidate } = await supabase
      .from("lr_candidate")
      .select("id, user_id")
      .eq("room_id", roomId)
      .eq("id", candidateId)
      .single();

    if (!candidate) {
      throw new Error("Candidate not found in this room");
    }

    // Use the database function to finalize selection
    const { data: result, error } = await supabase
      .rpc("finalize_lr_selection", {
        room_uuid: roomId,
        selected_candidate_uuid: candidateId
      });

    if (error || !result) {
      console.error("Finalize selection error:", error);
      throw new Error("Failed to finalize LR selection");
    }

    // Update the selected candidate's role to LR
    await supabase
      .from("mbdf_member")
      .update({ role: "lr" })
      .eq("room_id", roomId)
      .eq("user_id", candidate.user_id);

    // Log the action (finalize_lr_selection function already logs, but add our own too)
    await supabase
      .from("audit_log")
      .insert({
        room_id: roomId,
        user_id: user.id,
        action: "lr_selection_finalized",
        resource_type: "lr_candidate",
        resource_id: candidateId,
        new_values: { selected_candidate_id: candidateId, finalized_by: user.id }
      });

    revalidatePath(`/mbdf/${roomId}`);
  } catch (error) {
    console.error("Finalize LR selection error:", error);
    throw error;
  }
}

// Remove LR candidate (only before voting starts or by admin)
export async function removeLRCandidate(roomId: string, candidateId: string) {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();

  try {
    // Check if user has permission to remove candidates
    const { data: member } = await supabase
      .from("mbdf_member")
      .select("role")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!member || (member.role !== "admin" && member.role !== "lr")) {
      throw new Error("Insufficient permissions to remove candidates");
    }

    // Check if candidate exists and is not selected
    const { data: candidate } = await supabase
      .from("lr_candidate")
      .select("id, is_selected, user_id")
      .eq("room_id", roomId)
      .eq("id", candidateId)
      .single();

    if (!candidate) {
      throw new Error("Candidate not found");
    }

    if (candidate.is_selected) {
      throw new Error("Cannot remove selected LR candidate");
    }

    // Check if any votes exist for this candidate
    const { count: voteCount } = await supabase
      .from("lr_vote")
      .select("*", { count: "exact", head: true })
      .eq("candidate_id", candidateId);

    if (voteCount && voteCount > 0 && member.role !== "admin") {
      throw new Error("Cannot remove candidate after voting has started (admin required)");
    }

    // Remove all votes for this candidate first
    if (voteCount && voteCount > 0) {
      await supabase
        .from("lr_vote")
        .delete()
        .eq("candidate_id", candidateId);
    }

    // Remove candidate
    const { error } = await supabase
      .from("lr_candidate")
      .delete()
      .eq("id", candidateId);

    if (error) {
      console.error("Remove candidate error:", error);
      throw new Error("Failed to remove candidate");
    }

    // Log the action
    await supabase
      .from("audit_log")
      .insert({
        room_id: roomId,
        user_id: user.id,
        action: "lr_candidate_removed",
        resource_type: "lr_candidate",
        resource_id: candidateId,
        old_values: { candidate_user_id: candidate.user_id, vote_count: voteCount }
      });

    revalidatePath(`/mbdf/${roomId}`);
  } catch (error) {
    console.error("Remove candidate error:", error);
    throw error;
  }
}