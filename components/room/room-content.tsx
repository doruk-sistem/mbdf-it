"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, FileText, Package, Vote, Settings, MoreVertical, Archive } from "lucide-react";
import { useRoom } from "@/hooks/use-rooms";
import { Skeleton } from "@/components/ui/skeleton";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

import { MembersTab } from "./tabs/members-tab";
import { DocumentsTab } from "./tabs/documents-tab";
import { PackagesTab } from "./tabs/packages-tab";
import { VotingTab } from "./tabs/voting-tab";
import { ArchiveDialog } from "./archive-dialog";
import { ArchivedBanner } from "./archived-banner";
import { isRoomArchived, getRoomStatusText, getRoomStatusVariant } from "@/lib/archive-utils";
import { useCanArchiveRoom, useIsRoomAdmin } from "@/hooks/use-user";

interface RoomContentProps {
  roomId: string;
}

export function RoomContent({ roomId }: RoomContentProps) {
  const [activeTab, setActiveTab] = useState("members");
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  
  // Query hooks
  const { data: room, isLoading, error } = useRoom(roomId);
  
  // Get user role and permissions for this specific room
  const canArchive = useCanArchiveRoom(roomId);
  const isRoomAdmin = useIsRoomAdmin(roomId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-4 w-48" />
        </div>
        
        {/* Stats Skeleton */}
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Oda bilgileri yüklenirken bir hata oluştu.</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Oda bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Archived Banner */}
      {isRoomArchived(room) && (
        <ArchivedBanner
          roomId={roomId}
          roomName={room.name}
          archivedAt={room.archived_at || undefined}
          archiveReason={room.archive_reason || undefined}
          isAdmin={isRoomAdmin}
        />
      )}
      
      {/* Room Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold tracking-tight">{room.name}</h1>
            <Badge variant={getRoomStatusVariant(room.status)}>
              {getRoomStatusText(room.status)}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {room.description || "MBDF odası"}
          </p>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>EC: {room.substance?.ec_number || 'N/A'}</span>
            <span>•</span>
            <span>CAS: {room.substance?.cas_number || 'N/A'}</span>
            <span>•</span>
            <span>Oluşturulma: {new Date(room.created_at).toLocaleDateString('tr-TR')}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Ayarlar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={isRoomArchived(room)}>
                Odayı düzenle
              </DropdownMenuItem>
              <DropdownMenuItem disabled={isRoomArchived(room)}>
                Üye ekle
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {!isRoomArchived(room) && canArchive && (
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => setArchiveDialogOpen(true)}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Odayı arşivle
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* Room Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid gap-4 md:grid-cols-3"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Üye Sayısı</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{room.member_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              Aktif üyeler
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dokümanlar</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{room.document_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              Yüklenen dosyalar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paketler</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{room.package_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              Erişim paketleri
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Room Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="members">
              <Users className="mr-2 h-4 w-4" />
              Üyeler
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="mr-2 h-4 w-4" />
              Dokümanlar
            </TabsTrigger>
            <TabsTrigger value="packages">
              <Package className="mr-2 h-4 w-4" />
              Paketler
            </TabsTrigger>
            <TabsTrigger value="voting">
              <Vote className="mr-2 h-4 w-4" />
              LR Oylaması
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <MembersTab roomId={roomId} isArchived={isRoomArchived(room)} />
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <DocumentsTab roomId={roomId} isArchived={isRoomArchived(room)} />
          </TabsContent>

          <TabsContent value="packages" className="space-y-4">
            <PackagesTab roomId={roomId} />
          </TabsContent>

          <TabsContent value="voting" className="space-y-4">
            <VotingTab roomId={roomId} />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Archive Dialog */}
      <ArchiveDialog
        roomId={roomId}
        roomName={room.name}
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
      />
    </div>
  );
}