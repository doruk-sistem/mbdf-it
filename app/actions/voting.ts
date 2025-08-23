"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase";
import type { Database } from "@/types/supabase";

// Get current user
async function getCurrentUser() {
  const supabase = createServerSupabase();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Unauthorized");
  }
  
  return user;
}

// Nominate candidate for LR
export async function nominateCandidate(roomId: string, candidateUserId: string) {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();

  try {
    // Check if user is a member of the room
    const { data: membership } = await supabase
      .from("mbdf_member")
      .select("role")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      throw new Error("Not a member of this room");
    }

    // Check if candidate is also a member
    const { data: candidateMembership } = await supabase
      .from("mbdf_member")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", candidateUserId)
      .single();

    if (!candidateMembership) {
      throw new Error("Candidate is not a member of this room");
    }

    // Check if already nominated
    const { data: existingCandidate } = await supabase
      .from("lr_candidate")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", candidateUserId)
      .single();

    if (existingCandidate) {
      throw new Error("User is already nominated as LR candidate");
    }

    // Add candidate
    const { error } = await supabase
      .from("lr_candidate")
      .insert({
        room_id: roomId,
        user_id: candidateUserId,
        is_selected: false
      });

    if (error) {
      console.error("Nominate candidate error:", error);
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
        new_values: { room_id: roomId, candidate_user_id: candidateUserId }
      });

    revalidatePath(`/mbdf/${roomId}`);
  } catch (error) {
    console.error("Nominate candidate error:", error);
    throw new Error("Failed to nominate candidate");
  }
}

// Cast vote for LR candidate
export async function castVote(
  roomId: string,
  candidateId: string,
  scores: {
    technical_score: number;
    experience_score: number;
    availability_score: number;
    communication_score: number;
    leadership_score: number;
  }
) {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();

  try {
    // Check if user is a member of the room
    const { data: membership } = await supabase
      .from("mbdf_member")
      .select("role")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      throw new Error("Not a member of this room");
    }

    // Validate scores
    Object.values(scores).forEach(score => {
      if (score < 0 || score > 5) {
        throw new Error("Scores must be between 0 and 5");
      }
    });

    // Check if candidate exists
    const { data: candidate } = await supabase
      .from("lr_candidate")
      .select("id")
      .eq("room_id", roomId)
      .eq("id", candidateId)
      .single();

    if (!candidate) {
      throw new Error("Candidate not found");
    }

    // Insert or update vote
    const { error } = await supabase
      .from("lr_vote")
      .upsert({
        room_id: roomId,
        voter_id: user.id,
        candidate_id: candidateId,
        ...scores
      });

    if (error) {
      console.error("Cast vote error:", error);
      throw new Error("Failed to cast vote");
    }

    // Log the action
    await supabase
      .from("audit_log")
      .insert({
        room_id: roomId,
        user_id: user.id,
        action: "vote_cast",
        resource_type: "lr_vote",
        new_values: { candidate_id: candidateId, scores }
      });

    revalidatePath(`/mbdf/${roomId}`);
  } catch (error) {
    console.error("Cast vote error:", error);
    throw new Error("Failed to cast vote");
  }
}

// Finalize LR selection
export async function finalizeLRSelection(roomId: string, candidateId: string) {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();

  try {
    // Check if user has permission (admin only)
    const { data: membership } = await supabase
      .from("mbdf_member")
      .select("role")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "admin") {
      throw new Error("Only administrators can finalize LR selection");
    }

    // Reset all candidates
    await supabase
      .from("lr_candidate")
      .update({ is_selected: false })
      .eq("room_id", roomId);

    // Select the chosen candidate
    const { error } = await supabase
      .from("lr_candidate")
      .update({ is_selected: true })
      .eq("room_id", roomId)
      .eq("id", candidateId);

    if (error) {
      console.error("Finalize selection error:", error);
      throw new Error("Failed to finalize selection");
    }

    // Update member role to LR
    const { data: candidate } = await supabase
      .from("lr_candidate")
      .select("user_id")
      .eq("id", candidateId)
      .single();

    if (candidate) {
      await supabase
        .from("mbdf_member")
        .update({ role: "lr" })
        .eq("room_id", roomId)
        .eq("user_id", candidate.user_id);
    }

    // Log the action
    await supabase
      .from("audit_log")
      .insert({
        room_id: roomId,
        user_id: user.id,
        action: "lr_selected",
        resource_type: "lr_candidate",
        new_values: { candidate_id: candidateId }
      });

    revalidatePath(`/mbdf/${roomId}`);
  } catch (error) {
    console.error("Finalize selection error:", error);
    throw new Error("Failed to finalize selection");
  }
}

// Get voting results and candidates
export async function getVotingResults(roomId: string) {
  const user = await getCurrentUser();
  const supabase = createServerSupabase();

  try {
    // Check if user is a member of the room
    const { data: membership } = await supabase
      .from("mbdf_member")
      .select("role")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      throw new Error("Not a member of this room");
    }

    // Get candidates with vote results
    const { data: candidatesData, error } = await supabase
      .from("lr_candidate")
      .select(`
        id,
        user_id,
        is_selected,
        created_at,
        profiles:user_id (
          full_name,
          email,
          company:company_id (
            name
          )
        )
      `)
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Get voting results error:", error);
      throw new Error("Failed to get voting results");
    }

    // Get vote statistics for each candidate
    const candidatesWithScores = await Promise.all(
      candidatesData.map(async (candidate) => {
        // Get votes for this candidate
        const { data: votes } = await supabase
          .from("lr_vote")
          .select("technical_score, experience_score, availability_score, communication_score, leadership_score")
          .eq("candidate_id", candidate.id);

        let averageScores = {
          technical: 0,
          experience: 0,
          availability: 0,
          communication: 0,
          leadership: 0
        };

        let totalScore = 0;
        let voteCount = votes?.length || 0;

        if (votes && votes.length > 0) {
          const totals = votes.reduce((acc, vote) => ({
            technical: acc.technical + (vote.technical_score || 0),
            experience: acc.experience + (vote.experience_score || 0),
            availability: acc.availability + (vote.availability_score || 0),
            communication: acc.communication + (vote.communication_score || 0),
            leadership: acc.leadership + (vote.leadership_score || 0)
          }), { technical: 0, experience: 0, availability: 0, communication: 0, leadership: 0 });

          averageScores = {
            technical: totals.technical / voteCount,
            experience: totals.experience / voteCount,
            availability: totals.availability / voteCount,
            communication: totals.communication / voteCount,
            leadership: totals.leadership / voteCount
          };

          totalScore = Object.values(averageScores).reduce((sum, score) => sum + score, 0) / 5;
        }

        return {
          id: candidate.id,
          user_id: candidate.user_id,
          user: candidate.profiles,
          is_selected: candidate.is_selected,
          total_score: totalScore,
          vote_count: voteCount,
          scores: averageScores
        };
      })
    );

    // Get current user's votes
    const { data: userVotes } = await supabase
      .from("lr_vote")
      .select("candidate_id, technical_score, experience_score, availability_score, communication_score, leadership_score")
      .eq("room_id", roomId)
      .eq("voter_id", user.id);

    return {
      candidates: candidatesWithScores,
      userVotes: userVotes || [],
      currentUserRole: membership.role
    };
  } catch (error) {
    console.error("Get voting results error:", error);
    throw new Error("Failed to get voting results");
  }
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