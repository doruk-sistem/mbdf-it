"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Building2, Users, FileText, Clock, ArrowRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Mock data - in real app, this would come from Supabase
const mockRooms = [
  {
    id: "1",
    name: "Benzene MBDF",
    substance: {
      name: "Benzene",
      ec_number: "200-753-7",
      cas_number: "71-43-2"
    },
    status: "active",
    member_count: 8,
    created_at: "2024-01-15T10:00:00Z"
  },
  {
    id: "2", 
    name: "Toluene MBDF",
    substance: {
      name: "Toluene",
      ec_number: "203-625-9",
      cas_number: "108-88-3"
    },
    status: "active",
    member_count: 12,
    created_at: "2024-02-01T14:30:00Z"
  },
  {
    id: "3",
    name: "Acetone MBDF",
    substance: {
      name: "Acetone", 
      ec_number: "200-662-2",
      cas_number: "67-64-1"
    },
    status: "closed",
    member_count: 15,
    created_at: "2024-01-08T09:15:00Z"
  }
];

const mockStats = {
  total_rooms: 3,
  active_rooms: 2,
  total_members: 35,
  pending_requests: 4
};

const mockActivity = [
  {
    id: "1",
    action: "Yeni erişim isteği oluşturuldu",
    user: "Ahmet Yılmaz",
    room: "Benzene MBDF",
    time: "2 saat önce",
    type: "request"
  },
  {
    id: "2", 
    action: "LR seçimi tamamlandı",
    user: "Sistem",
    room: "Toluene MBDF", 
    time: "5 saat önce",
    type: "vote"
  },
  {
    id: "3",
    action: "Dokuman yüklendi",
    user: "Fatma Kaya",
    room: "Benzene MBDF",
    time: "1 gün önce", 
    type: "document"
  }
];

export function DashboardContent() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

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
            <div className="text-2xl font-bold">{mockStats.total_rooms}</div>
            <p className="text-xs text-muted-foreground">
              +1 geçen aydan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Odalar</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.active_rooms}</div>
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
            <div className="text-2xl font-bold">{mockStats.total_members}</div>
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
            <div className="text-2xl font-bold">{mockStats.pending_requests}</div>
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
              {mockActivity.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.1 }}
                  className="flex items-center space-x-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.action}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.user} • {activity.room}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {activity.time}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {activity.type}
                  </Badge>
                </motion.div>
              ))}
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
                  Aktif MBDF odalarınızı yönetin
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
            {mockRooms.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {mockRooms.map((room, index) => (
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
                              {room.status === "active" ? "Aktif" : "Kapalı"}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              EC: {room.substance.ec_number}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              CAS: {room.substance.cas_number}
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
                  İlk MBDF odanızı oluşturarak başlayın.
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