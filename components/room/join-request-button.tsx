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
  // Join request functionality is no longer needed
  // All authenticated users can access all rooms without membership
  return null;
}
