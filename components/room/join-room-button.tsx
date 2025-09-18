"use client";

import { useState } from "react";
import { UserPlus, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useMembers, useJoinRoom, type MembersListResponse } from "@/hooks/use-members";
import { useQueryClient } from "@tanstack/react-query";

interface JoinRoomButtonProps {
  roomId: string;
  roomName: string;
  isArchived?: boolean;
}

export function JoinRoomButton({
  roomId,
  roomName,
  isArchived = false,
}: JoinRoomButtonProps) {
  const { toast } = useToast();
  const { data: membersData } = useMembers(roomId);
  const joinRoomMutation = useJoinRoom();
  
  // Check if current user is already a member
  const isMember = (membersData as MembersListResponse | undefined)?.currentUserRole !== null && 
                   (membersData as MembersListResponse | undefined)?.currentUserRole !== undefined;

  const handleJoinRoom = async () => {
    if (isMember) {
      toast({
        title: "Zaten Üyesiniz",
        description: "Bu odanın zaten bir üyesisiniz.",
        variant: "default",
      });
      return;
    }

    joinRoomMutation.mutate(
      { roomId, role: "member" },
      {
        onSuccess: () => {
          toast({
            title: "Odaya Katıldınız! 🎉",
            description: `${roomName} odasına başarıyla katıldınız.`,
            variant: "default",
          });
        },
        onError: (error: any) => {
          toast({
            title: "Katılım Başarısız",
            description: error?.data?.message || "Odaya katılırken bir hata oluştu.",
            variant: "destructive",
          });
        },
      }
    );
  };

  // Don't show button if user is already a member or room is archived
  if (isMember || isArchived) {
    return null;
  }

  return (
    <Button
      onClick={handleJoinRoom}
      disabled={joinRoomMutation.isPending}
      className="gap-2 bg-green-600 hover:bg-green-700 text-white"
      size="sm"
    >
      {joinRoomMutation.isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Katılıyor...
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          Odaya Katıl
        </>
      )}
    </Button>
  );
}
