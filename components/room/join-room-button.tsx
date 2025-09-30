"use client";

import { useState } from "react";
import { UserPlus, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useMembers, useJoinRoom, type MembersListResponse } from "@/hooks/use-members";
import { useQueryClient } from "@tanstack/react-query";
import { TONNAGE_RANGES } from "@/lib/tonnage";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTonnage, setSelectedTonnage] = useState<string>("");
  
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

    if (!selectedTonnage) {
      toast({
        title: "Tonnage Seçimi Gerekli",
        description: "Odaya katılabilmek için lütfen tonaj aralığını seçiniz.",
        variant: "destructive",
      });
      return;
    }

    joinRoomMutation.mutate(
      { roomId, role: "member", tonnageRange: selectedTonnage },
      {
        onSuccess: () => {
          toast({
            title: "Odaya Katıldınız! 🎉",
            description: `${roomName} odasına başarıyla katıldınız.`,
            variant: "default",
          });
          setIsDialogOpen(false);
          setSelectedTonnage("");
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
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          className="gap-2 bg-green-600 hover:bg-green-700 text-white"
          size="sm"
        >
          <UserPlus className="h-4 w-4" />
          Odaya Katıl
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Odaya Katıl</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tonnage-select">Tonaj Aralığı *</Label>
            <Select
              value={selectedTonnage}
              onValueChange={setSelectedTonnage}
            >
              <SelectTrigger>
                <SelectValue placeholder="Odaya katılmak için tonaj aralığını seçin" />
              </SelectTrigger>
              <SelectContent>
                {TONNAGE_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              İptal
            </Button>
            <Button
              onClick={handleJoinRoom}
              disabled={joinRoomMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
              style={{ opacity: !selectedTonnage ? 0.5 : 1 }}
            >
              {joinRoomMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Katılıyor...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Odaya Katıl
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
