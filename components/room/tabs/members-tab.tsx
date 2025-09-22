"use client";

import { useState } from "react";
import { Plus, UserX, Crown, Shield, MoreHorizontal, Edit2, Check, X } from "lucide-react";
import {
  useMembers,
  useJoinRoom,
  useLeaveRoom,
  useAddMember,
  type MembersListResponse,
} from "@/hooks/use-members";
import { useAuth } from "@/components/auth/auth-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { Database } from "@/types/supabase";
import { TONNAGE_RANGES, getTonnageLabel } from "@/lib/tonnage";
import type { MemberWithProfile } from "@/lib/schemas";

interface MembersTabProps {
  roomId: string;
  isArchived?: boolean;
}

export function MembersTab({ roomId, isArchived = false }: MembersTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [editingTonnage, setEditingTonnage] = useState<string | null>(null);
  const [tempTonnageValue, setTempTonnageValue] = useState("");

  // Query hooks
  const { data: membersData, isLoading, error, refetch } = useMembers(roomId);
  const { user: currentUser } = useAuth();
  const addMemberMutation = useAddMember();
  const joinRoomMutation = useJoinRoom();
  const leaveRoomMutation = useLeaveRoom();

  // Extract data from query response
  const members = (membersData as MembersListResponse | undefined)?.items || [];
  const currentUserRole =
    (membersData as MembersListResponse | undefined)?.currentUserRole;
  const currentUserIdFromData = (membersData as MembersListResponse | undefined)?.currentUserId;

  // Find current user from members data by matching user_id
  const currentUserFromMembers = members.find(member => member.user_id === currentUser?.id);
  
  // Get current user ID - prioritize from auth context, fallback to data
  const currentUserId = currentUser?.id || currentUserIdFromData;


  const filteredMembers = members.filter(
    (member: MemberWithProfile) =>
      member.profiles?.full_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      member.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.profiles?.company?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4" />;
      case "lr":
        return <Shield className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Yönetici";
      case "lr":
        return "LR";
      case "member":
        return "Üye";
      default:
        return role;
    }
  };

  const getRoleVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "lr":
        return "default";
      default:
        return "secondary";
    }
  };

  const handleTonnageEdit = (memberId: string, currentTonnage: string | null) => {
    setEditingTonnage(memberId);
    setTempTonnageValue(currentTonnage || "");
  };

  const handleTonnageSave = async (memberId: string) => {
    try {
      const response = await fetch('/api/members', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId,
          tonnageRange: tempTonnageValue,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh members data using React Query
        await refetch();
      } else {
        console.error('Failed to update tonnage:', data.error);
        alert(`Hata: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating tonnage:', error);
      alert('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setEditingTonnage(null);
      setTempTonnageValue("");
    }
  };

  const handleTonnageCancel = () => {
    setEditingTonnage(null);
    setTempTonnageValue("");
  };

  // Handle adding new member
  const handleAddMember = () => {
    if (!newMemberEmail.trim()) {
      return;
    }

    addMemberMutation.mutate(
      {
        roomId,
        userEmail: newMemberEmail.trim(),
        role: "member", // Always add as member - LR is selected through voting
      },
      {
        onSuccess: () => {
          setNewMemberEmail("");
          setAddMemberDialogOpen(false);
        },
      }
    );
  };

  // Handle removing member
  const handleRemoveMember = (memberId: string) => {
    leaveRoomMutation.mutate({ roomId, userId: memberId });
  };


  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Oda Üyeleri</CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-48" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[150px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Oda Üyeleri</CardTitle>
          <CardDescription className="text-destructive">
            Üyeler yüklenirken bir hata oluştu.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Oda Üyeleri</CardTitle>
            <CardDescription>
              Bu odadaki tüm üyeleri görüntüleyin ve yönetin
            </CardDescription>
          </div>
          {/* Only show Add Member button for admin and LR roles */}
          {(currentUserRole === "admin" || currentUserRole === "lr") && (
            <Dialog
                open={addMemberDialogOpen}
                onOpenChange={setAddMemberDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    disabled={isArchived}
                    title={
                      isArchived ? "Arşivli odada işlem yapılamaz" : undefined
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Üye Ekle
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni Üye Ekle</DialogTitle>
                  <DialogDescription>
                    Odaya yeni üye eklemek için e-posta adresini girin. 
                    Tüm yeni üyeler "Üye" rolünde eklenir. LR seçimi oylama ile yapılır.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">E-posta Adresi</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="ornek@sirket.com"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      disabled={addMemberMutation.isPending || isArchived}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setAddMemberDialogOpen(false)}
                      disabled={addMemberMutation.isPending}
                      className="flex-1"
                    >
                      İptal
                    </Button>
                    <Button
                      onClick={handleAddMember}
                      disabled={
                        addMemberMutation.isPending ||
                        !newMemberEmail.trim() ||
                        isArchived
                      }
                      className="flex-1"
                    >
                      {addMemberMutation.isPending ? "Ekleniyor..." : "Ekle"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Üye ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Members Table */}
        <div className="border rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Üye</TableHead>
                <TableHead>Şirket</TableHead>
                <TableHead>Tonaj</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Katılım Tarihi</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member: MemberWithProfile) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.profiles?.avatar_url || ""} />
                        <AvatarFallback>
                          {member.profiles?.full_name
                            ? member.profiles.full_name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .toUpperCase()
                            : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {member.profiles?.full_name || "İsimsiz"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.profiles?.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {member.profiles?.company?.name || "Şirket bilgisi yok"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {editingTonnage === member.id ? (
                      <div className="flex items-center space-x-2">
                        <Select
                          value={tempTonnageValue}
                          onValueChange={setTempTonnageValue}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {TONNAGE_RANGES.map((range) => (
                              <SelectItem key={range.value} value={range.value}>
                                {range.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTonnageSave(member.id!)}
                          className="h-6 w-6 p-0"
                        >
                          <Check className="h-3 w-3 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleTonnageCancel}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">
                          {getTonnageLabel(member.tonnage_range || null)}
                        </span>
                        {member.user_id === currentUserId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTonnageEdit(member.id!, member.tonnage_range || null)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getRoleVariant(member.role)}
                      className="text-xs"
                    >
                      <span className="flex items-center space-x-1">
                        {getRoleIcon(member.role)}
                        <span>{getRoleLabel(member.role)}</span>
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(member.joined_at || '').toLocaleDateString("tr-TR")}
                    </span>
                  </TableCell>
                  <TableCell>
                    {/* Show remove option based on permissions:
                        1. Normal members: can only remove themselves
                        2. LR: can remove others (except admins) but not themselves
                        3. Admin: can remove others (except other admins) but not themselves */}
                    {((currentUserRole === "admin" && member.role !== "admin") ||
                      (currentUserRole === "lr" && member.role !== "admin" && member.role !== "lr") ||
                      (currentUserRole === "member" && currentUserId === member.user_id) ||
                      (currentUserId === member.user_id)) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={
                                leaveRoomMutation.isPending
                              }
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleRemoveMember(member.id!)}
                              disabled={
                                isArchived || leaveRoomMutation.isPending
                              }
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              {currentUserId === member.user_id ? "Odadan Ayrıl" : "Odadan Çıkar"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Arama kriterlerinize uygun üye bulunamadı.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
