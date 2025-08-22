"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, FileText, Package, Vote, Settings, MoreVertical } from "lucide-react";

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

interface RoomContentProps {
  roomId: string;
}

// Mock data - in real app, this would come from Supabase
const mockRoom = {
  id: "1",
  name: "Benzene MBDF",
  description: "Benzene maddesinin MBDF süreçlerini yönetmek için oluşturulmuş oda",
  substance: {
    name: "Benzene",
    ec_number: "200-753-7",
    cas_number: "71-43-2"
  },
  status: "active",
  member_count: 8,
  document_count: 15,
  package_count: 3,
  created_at: "2024-01-15T10:00:00Z"
};

export function RoomContent({ roomId }: RoomContentProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("members");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Room Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold tracking-tight">{mockRoom.name}</h1>
            <Badge variant={mockRoom.status === "active" ? "default" : "secondary"}>
              {mockRoom.status === "active" ? "Aktif" : "Kapalı"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {mockRoom.description}
          </p>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>EC: {mockRoom.substance.ec_number}</span>
            <span>•</span>
            <span>CAS: {mockRoom.substance.cas_number}</span>
            <span>•</span>
            <span>Oluşturulma: {new Date(mockRoom.created_at).toLocaleDateString('tr-TR')}</span>
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
              <DropdownMenuItem>
                Odayı düzenle
              </DropdownMenuItem>
              <DropdownMenuItem>
                Üye ekle
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Odayı arşivle
              </DropdownMenuItem>
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
            <div className="text-2xl font-bold">{mockRoom.member_count}</div>
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
            <div className="text-2xl font-bold">{mockRoom.document_count}</div>
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
            <div className="text-2xl font-bold">{mockRoom.package_count}</div>
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
            <MembersTab roomId={roomId} />
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <DocumentsTab roomId={roomId} />
          </TabsContent>

          <TabsContent value="packages" className="space-y-4">
            <PackagesTab roomId={roomId} />
          </TabsContent>

          <TabsContent value="voting" className="space-y-4">
            <VotingTab roomId={roomId} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}