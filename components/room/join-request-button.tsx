"use client";

import { useState } from "react";
import { UserPlus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { useCreateJoinRequest } from "@/hooks/use-join-requests";
import { useRoomMemberRole } from "@/hooks/use-user";

interface JoinRequestButtonProps {
  roomId: string;
  roomName: string;
  isArchived?: boolean;
}

export function JoinRequestButton({
  roomId,
  roomName,
  isArchived = false,
}: JoinRequestButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const { toast } = useToast();
  const createJoinRequestMutation = useCreateJoinRequest();
  // Check if current user is a member of this room
  const userRole = useRoomMemberRole(roomId);
  const isMember = userRole !== null;

  const handleSubmit = async () => {
    if (!acceptTerms) {
      toast({
        title: "Hata",
        description: "Şartları kabul etmelisiniz",
        variant: "destructive",
      });
      return;
    }

    createJoinRequestMutation.mutate(
      {
        roomId,
        message: message.trim() || undefined,
        acceptTerms,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setMessage("");
          setAcceptTerms(false);
        },
      }
    );
  };

  // Don't show button if user is already a member
  if (isMember) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isArchived}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Katılım Talebi Gönder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Katılım Talebi
          </DialogTitle>
          <DialogDescription>
            <strong>{roomName}</strong> odasına katılım talebi göndermek
            istediğinizi onaylıyor musunuz?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="message">Mesaj (İsteğe bağlı)</Label>
            <Textarea
              id="message"
              placeholder="Katılım nedeninizi açıklayabilirsiniz..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="terms"
              checked={acceptTerms}
              onCheckedChange={(checked: boolean) => setAcceptTerms(checked)}
            />
            <Label htmlFor="terms" className="text-sm">
              MBDF oda kurallarını ve şartlarını kabul ediyorum
            </Label>
          </div>

          <div className="flex space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createJoinRequestMutation.isPending}
              className="flex-1"
            >
              İptal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createJoinRequestMutation.isPending || !acceptTerms}
              className="flex-1 gap-2"
            >
              {createJoinRequestMutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Talebi Gönder
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
