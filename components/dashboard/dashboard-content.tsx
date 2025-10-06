"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  FileText,
  Clock,
  ArrowRight,
  Plus,
  FlaskConical,
  Shield,
  Database,
  Settings,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  Search,
  Pencil,
  X,
  Save,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { DashboardSkeleton } from "./dashboard-skeleton";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

interface AdminStats {
  total_users: number;
  total_companies: number;
  total_rooms: number;
  active_rooms: number;
  archived_rooms: number;
  total_documents: number;
  pending_access_requests: number;
  pending_join_requests: number;
}

export function DashboardContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailModalType, setDetailModalType] = useState<'users' | 'companies' | 'documents' | null>(null);
  const [roomsPage, setRoomsPage] = useState(0);
  const roomsPerPage = 9; // 3x3 grid için 9 oda

  // Fetch admin statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => get('/api/admin/stats'),
  });

  // Fetch all rooms (admin can see all)
  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['admin', 'rooms'],
    queryFn: () => get('/api/rooms'),
  });

  const isLoading = statsLoading || roomsLoading;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const stats: AdminStats = statsData?.stats || {
    total_users: 0,
    total_companies: 0,
    total_rooms: 0,
    active_rooms: 0,
    archived_rooms: 0,
    total_documents: 0,
    pending_access_requests: 0,
    pending_join_requests: 0,
  };

  const rooms = roomsData?.items || [];

  // Filter rooms based on search term
  const filteredRooms = rooms.filter((room: any) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      room.name?.toLowerCase().includes(searchLower) ||
      room.substance?.name?.toLowerCase().includes(searchLower) ||
      room.substance?.cas_number?.toLowerCase().includes(searchLower) ||
      room.substance?.ec_number?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination için odaları böl
  const totalRoomPages = Math.ceil(filteredRooms.length / roomsPerPage);
  const startIndex = roomsPage * roomsPerPage;
  const endIndex = startIndex + roomsPerPage;
  const paginatedRooms = filteredRooms.slice(startIndex, endIndex);

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center space-x-2 text-amber-600"
      >
        <Shield className="h-5 w-5" />
        <span className="text-sm font-semibold">Admin Paneli</span>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Kullanıcı</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.total_users}</div>
            <p className="text-xs text-muted-foreground">Sistemdeki tüm kullanıcılar</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Şirket</CardTitle>
            <Building2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.total_companies}</div>
            <p className="text-xs text-muted-foreground">Kayıtlı şirketler</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Oda</CardTitle>
            <Database className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.total_rooms}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active_rooms} aktif, {stats.archived_rooms} arşivlendi
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Secondary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid gap-4 md:grid-cols-3"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Odalar</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_rooms}</div>
            <p className="text-xs text-muted-foreground">Şu anda aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Doküman</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_documents}</div>
            <p className="text-xs text-muted-foreground">Yüklenen belgeler</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sistem Sağlığı</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">100%</div>
            <p className="text-xs text-muted-foreground">Tüm servisler çalışıyor</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Admin Actions & Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="col-span-4"
        >
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>İzleme ve Denetim</span>
              </CardTitle>
              <CardDescription>
                Sistem durumunu izleyin ve raporları görüntüleyin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center space-x-2 text-amber-800">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm font-semibold">Admin Yetkisi</span>
                </div>
                <p className="text-xs text-amber-700">
                  Sistem üzerinde görüntüleme ve denetim yetkisine sahipsiniz. 
                  Operasyonel süreçlere müdahale yetkisi bulunmamaktadır.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Görüntüleme</h4>
                
                <button 
                  onClick={() => {
                    setDetailModalType('users');
                    setDetailModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Toplam Kullanıcı</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-600">{stats.total_users}</span>
                </button>

                <button 
                  onClick={() => {
                    setDetailModalType('companies');
                    setDetailModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Kayıtlı Şirket</span>
                  </div>
                  <span className="text-sm font-semibold text-green-600">{stats.total_companies}</span>
                </button>

                <button 
                  onClick={() => {
                    // Scroll to rooms section
                    const roomsSection = document.getElementById('admin-rooms-section');
                    if (roomsSection) {
                      roomsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Toplam Oda</span>
                  </div>
                  <span className="text-sm font-semibold text-purple-600">{stats.total_rooms}</span>
                </button>

                <button 
                  onClick={() => {
                    setDetailModalType('documents');
                    setDetailModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">Toplam Doküman</span>
                  </div>
                  <span className="text-sm font-semibold text-orange-600">{stats.total_documents}</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="col-span-3"
        >
          <Card>
            <CardHeader>
              <CardTitle>Sistem Özeti</CardTitle>
              <CardDescription>Genel sistem durumu ve aktiviteler</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Sistem Durumu</h4>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm text-muted-foreground">
                    Tüm servisler çalışıyor
                  </span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Aktif Süreçler</h4>
                
                <div className="p-2 rounded-md bg-blue-50 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700">Aktif Odalar</span>
                    <span className="text-sm font-semibold text-blue-900">{stats.active_rooms}</span>
                  </div>
                </div>

                <div className="p-2 rounded-md bg-purple-50 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-purple-700">Arşivlenen Odalar</span>
                    <span className="text-sm font-semibold text-purple-900">{stats.archived_rooms}</span>
                  </div>
                </div>

                <div className="p-2 rounded-md bg-orange-50 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-orange-700">Yüklenen Belgeler</span>
                    <span className="text-sm font-semibold text-orange-900">{stats.total_documents}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2 text-green-800 mb-1">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-semibold">Sistem Sağlıklı</span>
                </div>
                <p className="text-xs text-green-700">
                  Son 24 saatte kritik hata tespit edilmedi.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* All MBDF Rooms (Admin View) */}
      <motion.div
        id="admin-rooms-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tüm MBDF Odaları - Denetim Görünümü</CardTitle>
                  <CardDescription>
                    Sistemdeki tüm odaları görüntüleyin (Sadece İzleme)
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-amber-700 border-amber-300">
                  <Shield className="mr-1 h-3 w-3" />
                  Admin Görünümü
                </Badge>
              </div>
              
              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Oda adı, madde, CAS veya EC numarası ile ara..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setRoomsPage(0); // Arama yapınca ilk sayfaya dön
                  }}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center justify-between">
                {searchTerm && (
                  <p className="text-sm text-muted-foreground">
                    {filteredRooms.length} oda bulundu (toplam {rooms.length})
                  </p>
                )}
                {!searchTerm && filteredRooms.length > roomsPerPage && (
                  <p className="text-sm text-muted-foreground">
                    Sayfa {roomsPage + 1} / {totalRoomPages} (toplam {filteredRooms.length} oda)
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredRooms.length > 0 ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {paginatedRooms.map((room: any, index: number) => (
                    <motion.div
                      key={room.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <Card className="cursor-pointer hover:bg-muted/50 transition-colors border-l-2 border-l-amber-400">
                        <Link href={`/mbdf/${room.id}`}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <CardTitle className="text-lg">
                                  {room.name}
                                </CardTitle>
                              </div>
                              <Badge
                                variant={
                                  room.status === "active"
                                    ? "default"
                                    : room.status === "closed"
                                    ? "secondary"
                                    : "outline"
                                }
                                className={
                                  room.status === "archived"
                                    ? "bg-gray-100 text-gray-600"
                                    : ""
                                }
                              >
                                {room.status === "active"
                                  ? "Aktif"
                                  : room.status === "closed"
                                  ? "Kapalı"
                                  : "Arşivlendi"}
                              </Badge>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">
                                {room.substance?.name || "Bilinmeyen madde"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                EC: {room.substance?.ec_number || "N/A"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                CAS: {room.substance?.cas_number || "N/A"}
                              </p>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  {room.member_count || 0} üye
                                </span>
                              </div>
                              <div className="flex items-center space-x-1 text-muted-foreground">
                                <span className="text-sm">
                                  {new Date(room.created_at).toLocaleDateString(
                                    "tr-TR"
                                  )}
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

                {/* Pagination Buttons */}
                {totalRoomPages > 1 && (
                  <div className="flex justify-center items-center space-x-4 pt-6 mt-6 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRoomsPage(Math.max(0, roomsPage - 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={roomsPage === 0}
                    >
                      Önceki
                    </Button>
                    
                    <div className="text-sm text-muted-foreground">
                      Sayfa {roomsPage + 1} / {totalRoomPages}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRoomsPage(Math.min(totalRoomPages - 1, roomsPage + 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={roomsPage >= totalRoomPages - 1}
                    >
                      Sonraki
                    </Button>
                  </div>
                )}
              </>
            ) : searchTerm ? (
              <div className="text-center py-12">
                <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">
                  Sonuç bulunamadı
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  &quot;{searchTerm}&quot; araması için oda bulunamadı.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setSearchTerm("")}
                >
                  Aramayı Temizle
                </Button>
              </div>
            ) : (
              <div className="text-center py-12">
                <Database className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">
                  Henüz oda oluşturulmamış
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sistemde henüz hiçbir MBDF odası bulunmamaktadır.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Detail Modal */}
      <AdminDetailModal 
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        type={detailModalType}
      />
    </div>
  );
}

// Admin Detail Modal Component
function AdminDetailModal({ 
  open, 
  onOpenChange, 
  type 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  type: 'users' | 'companies' | 'documents' | null;
}) {
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [editingItem, setEditingItem] = useState<any>(null);
  const itemsPerPage = 10; // Her sayfada 10 öğe
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', type],
    queryFn: () => {
      if (!type) return null;
      return get(`/api/admin/${type}`);
    },
    enabled: open && !!type,
  });

  // Delete user state
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Update mutation for users
  const updateUserMutation = useMutation({
    mutationFn: (data: { id: string; updates: any }) => 
      patch(`/api/admin/users/${data.id}`, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({
        title: "Başarılı",
        description: "Kullanıcı bilgileri güncellendi",
      });
      setEditingItem(null);
    },
    onError: (error: any) => {
      const errorMessage = error?.data?.error || error?.data?.details || error.message || "Kullanıcı güncellenirken bir hata oluştu";
      toast({
        title: "Hata",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Delete mutation for users
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => {
      return fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
          if (!data.success) throw new Error(data.error || 'Failed to delete user');
          return data;
        });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      
      // Show detailed success message with transfer summary
      const totalItems = data.total_items_transferred || 0;
      toast({
        title: "Başarılı",
        description: totalItems > 0 
          ? `Kullanıcı silindi ve ${totalItems} kayıt SUPER ADMIN'e transfer edildi.`
          : "Kullanıcı başarıyla silindi.",
      });
      setDeleteUserId(null);
      setDeleteConfirmOpen(false);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Kullanıcı silinirken bir hata oluştu";
      toast({
        title: "Hata",
        description: errorMessage,
        variant: "destructive",
      });
      setDeleteConfirmOpen(false);
    },
  });

  // Update mutation for companies
  const updateCompanyMutation = useMutation({
    mutationFn: (data: { id: string; updates: any }) => 
      patch(`/api/admin/companies/${data.id}`, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'companies'] });
      toast({
        title: "Başarılı",
        description: "Şirket bilgileri güncellendi",
      });
      setEditingItem(null);
    },
    onError: (error: any) => {
      const errorMessage = error?.data?.error || error?.data?.details || error.message || "Şirket güncellenirken bir hata oluştu";
      toast({
        title: "Hata",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Modal kapanınca state'i sıfırla
  useEffect(() => {
    if (!open) {
      setModalSearchTerm("");
      setCurrentPage(0);
      setEditingItem(null);
    }
  }, [open]);

  if (!type) return null;

  const getTitle = () => {
    switch (type) {
      case 'users': return 'Tüm Kullanıcılar';
      case 'companies': return 'Tüm Şirketler';
      case 'documents': return 'Tüm Dokümanlar';
      default: return 'Detaylar';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'users': return <Users className="h-5 w-5 text-blue-500" />;
      case 'companies': return <Building2 className="h-5 w-5 text-green-500" />;
      case 'documents': return <FileText className="h-5 w-5 text-orange-500" />;
      default: return null;
    }
  };

  // Filtreleme ve pagination logic
  const getFilteredAndPaginatedData = () => {
    let items: any[] = [];
    
    if (type === 'users') {
      items = data?.users || [];
      if (modalSearchTerm) {
        items = items.filter((item: any) => 
          item.full_name?.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
          item.email?.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
          item.company?.name?.toLowerCase().includes(modalSearchTerm.toLowerCase())
        );
      }
    } else if (type === 'companies') {
      items = data?.companies || [];
      if (modalSearchTerm) {
        items = items.filter((item: any) => 
          item.name?.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
          item.vat_number?.toLowerCase().includes(modalSearchTerm.toLowerCase())
        );
      }
    } else if (type === 'documents') {
      items = data?.documents || [];
      if (modalSearchTerm) {
        items = items.filter((item: any) => 
          item.name?.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
          item.mbdf_room?.name?.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
          item.profiles?.full_name?.toLowerCase().includes(modalSearchTerm.toLowerCase())
        );
      }
    }

    const totalPages = Math.ceil(items.length / itemsPerPage);
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = items.slice(startIndex, endIndex);

    return { items: paginatedItems, total: items.length, totalPages };
  };

  const { items, total, totalPages } = getFilteredAndPaginatedData();

  const handleSave = () => {
    if (!editingItem) return;

    if (type === 'users') {
      updateUserMutation.mutate({
        id: editingItem.id,
        updates: {
          full_name: editingItem.full_name,
          email: editingItem.email,
          phone: editingItem.phone || null,
          role: editingItem.role,
        },
      });
    } else if (type === 'companies') {
      updateCompanyMutation.mutate({
        id: editingItem.id,
        updates: {
          name: editingItem.name,
          vat_number: editingItem.vat_number || null,
          address: editingItem.address || null,
          contact_email: editingItem.contact_email || null,
          contact_phone: editingItem.contact_phone || null,
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {getIcon()}
            <span>{getTitle()}</span>
            <Badge variant="outline" className="text-amber-700 border-amber-300">
              <Shield className="mr-1 h-3 w-3" />
              Admin
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ara..."
            value={modalSearchTerm}
            onChange={(e) => {
              setModalSearchTerm(e.target.value);
              setCurrentPage(0); // Reset to first page on search
            }}
            className="pl-10"
          />
        </div>

        {modalSearchTerm && (
          <p className="text-sm text-muted-foreground mb-2">
            {total} sonuç bulundu
          </p>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Yükleniyor...</p>
          </div>
        ) : editingItem ? (
          // Edit Form
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center space-x-2 text-amber-800">
                <Pencil className="h-4 w-4" />
                <span className="text-sm font-semibold">
                  {type === 'users' ? 'Kullanıcı' : 'Şirket'} Düzenleniyor
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingItem(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {type === 'users' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Ad Soyad</Label>
                  <Input
                    id="full_name"
                    value={editingItem.full_name || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editingItem.email || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={editingItem.phone || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, phone: e.target.value || null })}
                    placeholder="Telefon numarası"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select
                    value={editingItem.role || 'member'}
                    onValueChange={(value) => setEditingItem({ ...editingItem, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="lr">LR</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : type === 'companies' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Şirket Adı</Label>
                  <Input
                    id="company_name"
                    value={editingItem.name || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vat_number">Vergi Numarası</Label>
                  <Input
                    id="vat_number"
                    value={editingItem.vat_number || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, vat_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Adres</Label>
                  <Input
                    id="address"
                    value={editingItem.address || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_email">İletişim E-posta</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={editingItem.contact_email || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, contact_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">İletişim Telefon</Label>
                  <Input
                    id="contact_phone"
                    value={editingItem.contact_phone || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, contact_phone: e.target.value })}
                  />
                </div>
              </div>
            ) : null}

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setEditingItem(null)}
              >
                İptal
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateUserMutation.isPending || updateCompanyMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                Kaydet
              </Button>
            </div>
          </div>
        ) : type === 'users' ? (
          <div className="space-y-2">
            {items.map((user: any) => (
              <div key={user.id} className="p-3 border rounded-lg hover:bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{user.full_name || 'İsimsiz'}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {user.company && (
                      <p className="text-xs text-muted-foreground">🏢 {user.company.name}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                      {user.role === 'admin' ? 'Admin' : user.role === 'lr' ? 'LR' : 'Member'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingItem({ ...user })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeleteUserId(user.id);
                        setDeleteConfirmOpen(true);
                      }}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Kullanıcıyı Sil</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Bu kullanıcıyı silmek üzeresiniz. Bu işlem geri alınamaz.
                  </p>
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      ⚠️ Önemli Bilgi:
                    </p>
                    <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                      <li>Kullanıcının oluşturduğu odalar sistem yöneticisine transfer edilecek</li>
                      <li>Yüklediği dokümanlar sistem yöneticisine transfer edilecek</li>
                      <li>Oluşturduğu anlaşmalar sistem yöneticisine transfer edilecek</li>
                      <li>Oda üyelikleri ve forum mesajları silinecek</li>
                      <li>Audit log kayıtları korunacak</li>
                    </ul>
                  </div>
                  <p className="text-sm font-medium">
                    Devam etmek istediğinizden emin misiniz?
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteConfirmOpen(false);
                      setDeleteUserId(null);
                    }}
                    disabled={deleteUserMutation.isPending}
                  >
                    İptal
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (deleteUserId) {
                        deleteUserMutation.mutate(deleteUserId);
                      }
                    }}
                    disabled={deleteUserMutation.isPending}
                  >
                    {deleteUserMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Siliniyor...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Evet, Sil
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : type === 'companies' ? (
          <div className="space-y-2">
            {items.map((company: any) => (
              <div key={company.id} className="p-3 border rounded-lg hover:bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{company.name}</p>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Vergi No:</span> {company.vat_number || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">İletişim:</span> {company.contact_email || company.contact_phone || 'N/A'}
                      </div>
                    </div>
                    {company.address && (
                      <p className="text-xs text-muted-foreground mt-1">📍 {company.address}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingItem({ ...company })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : type === 'documents' ? (
          <div className="space-y-2">
            {items.map((doc: any) => (
              <Link 
                key={doc.id} 
                href={`/mbdf/${doc.mbdf_room?.id}?tab=documents&documentId=${doc.id}`}
                className="block p-3 border rounded-lg hover:bg-muted/50 hover:border-orange-300 transition-all cursor-pointer"
                onClick={() => onOpenChange(false)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{doc.name}</p>
                    <div className="flex items-center space-x-2 mt-1 text-sm text-muted-foreground">
                      <span>📁 {doc.mbdf_room?.name || 'N/A'}</span>
                      <span>•</span>
                      <span>👤 {doc.profiles?.full_name || 'Bilinmeyen'}</span>
                      <span>•</span>
                      <span className="text-xs">
                        {new Date(doc.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}

        {/* Pagination */}
        {!editingItem && totalPages > 1 && (
          <div className="flex justify-center items-center space-x-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              Önceki
            </Button>
            
            <div className="text-sm text-muted-foreground">
              Sayfa {currentPage + 1} / {totalPages} ({total} öğe)
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              Sonraki
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
