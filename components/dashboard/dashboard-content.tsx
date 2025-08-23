"use client";

import Link from "next/link";
import { Building2, Users, FileText, Clock, ArrowRight, Plus } from "lucide-react";
import { useRooms } from "@/hooks/use-rooms";
import { DashboardSkeleton } from "./dashboard-skeleton";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";

interface DashboardStats {
  total_rooms: number;
  active_rooms: number;
  total_members: number;
  pending_requests: number;
}

interface DashboardActivity {
  id: string;
  action: string;
  user: string;
  room: string;
  time: string;
  type: string;
}

export function DashboardContent() {
  const { data: roomsData, isLoading, error } = useRooms();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Veri yüklenirken bir hata oluştu</p>
      </div>
    );
  }

  const rooms = roomsData?.items || [];
  
  // Calculate stats from rooms data
  const stats: DashboardStats = {
    total_rooms: rooms.length,
    active_rooms: rooms.filter(room => room.status === 'active').length,
    total_members: rooms.reduce((sum, room) => sum + (room.member_count || 0), 0),
    pending_requests: 0, // This would need a separate API call
  };

  // Mock activity data for now
  const activity: DashboardActivity[] = [];

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Oda</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_rooms}</div>
            <p className="text-xs text-muted-foreground">
              Katıldığınız odalar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Odalar</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_rooms}</div>
            <p className="text-xs text-muted-foreground">
              Şu anda aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Üye</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_members}</div>
            <p className="text-xs text-muted-foreground">
              Tüm odalarda
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bekleyen İstek</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_requests}</div>
            <p className="text-xs text-muted-foreground">
              Onay bekliyor
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="col-span-4"
        >
          <Card>
            <CardHeader>
              <CardTitle>Son Aktiviteler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activity.length > 0 ? (
                activity.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                    className="flex items-center space-x-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-none">
                        {item.action}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.user} • {item.room}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.time}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {item.type}
                    </Badge>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Henüz aktivite bulunmuyor
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="col-span-3"
        >
          <Card>
            <CardHeader>
              <CardTitle>Hızlı Erişim</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full justify-start">
                <Link href="/create-room">
                  <Plus className="mr-2 h-4 w-4" />
                  Yeni Oda Oluştur
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="w-full justify-start">
                <Link href="/agreements">
                  <FileText className="mr-2 h-4 w-4" />
                  Sözleşmeler
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="w-full justify-start">
                <Link href="/kks">
                  <Users className="mr-2 h-4 w-4" />
                  KKS Gönderimler
                </Link>
              </Button>

              <Separator />
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Sistem Durumu</h4>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm text-muted-foreground">Tüm servisler çalışıyor</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* MBDF Rooms */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>MBDF Odaları</CardTitle>
                <CardDescription>
                  Katıldığınız MBDF odalarını yönetin
                </CardDescription>
              </div>
              <Button asChild>
                <Link href="/create-room">
                  <Plus className="mr-2 h-4 w-4" />
                  Yeni Oda
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {rooms.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rooms.map((room, index) => (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <Link href={`/mbdf/${room.id}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{room.name}</CardTitle>
                            <Badge 
                              variant={room.status === "active" ? "default" : "secondary"}
                            >
                              {room.status === "active" ? "Aktif" : 
                               room.status === "closed" ? "Kapalı" : "Arşivlendi"}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              {room.substance?.name || 'Bilinmeyen madde'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              EC: {room.substance?.ec_number || 'N/A'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              CAS: {room.substance?.cas_number || 'N/A'}
                            </p>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {room.member_count} üye
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 text-muted-foreground">
                              <span className="text-sm">
                                {new Date(room.created_at).toLocaleDateString('tr-TR')}
                              </span>
                              <ArrowRight className="h-3 w-3" />
                            </div>
                          </div>
                        </CardContent>
                      </Link>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Henüz oda yok</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  İlk MBDF odanızı oluşturarak başlayın veya var olan bir odaya katılın.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/create-room">
                    <Plus className="mr-2 h-4 w-4" />
                    Oda Oluştur
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}