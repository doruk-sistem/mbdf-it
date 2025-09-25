"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Building2, 
  Users, 
  FileText, 
  Clock, 
  Plus, 
  Search,
  Database,
  Filter,
  Eye,
  Edit,
  Calendar,
  Trash2,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useCurrentUser } from "@/hooks/use-user";
import { useRooms } from "@/hooks/use-rooms";
import { useMyKKSSubmissions } from "@/hooks/use-kks";
import { useUserDocuments } from "@/hooks/use-documents";
import { useRecentActivities, useDetailedActivities } from "@/hooks/use-activities";
import { useDeleteDocument } from "@/hooks/use-documents";
import { useToast } from "@/components/ui/use-toast";



export function PersonalizedDashboard() {   
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMembership, setSelectedMembership] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [activityFilter, setActivityFilter] = useState("all");
  const [activityPage, setActivityPage] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [roomPage, setRoomPage] = useState(0);
  const [roomsPerPage] = useState(6);

  // Fetch real data
  const { data: userData, isLoading: userLoading } = useCurrentUser();
  const { data: roomsData, isLoading: roomsLoading } = useRooms();
  const { data: kksData, isLoading: kksLoading } = useMyKKSSubmissions(userData?.profile?.id || '');
  const { data: documentsData, isLoading: documentsLoading } = useUserDocuments(userData?.profile?.id || '');
  const { data: activitiesData, isLoading: activitiesLoading } = useRecentActivities();
  const { data: detailedActivitiesData, isLoading: detailedActivitiesLoading } = useDetailedActivities({
    limit: 20,
    offset: activityPage * 20,
    type: activityFilter === "all" ? undefined : activityFilter,
  });
  const deleteDocumentMutation = useDeleteDocument();
  const { toast } = useToast();

  // Join room handler
  const handleJoinRoom = async (roomId: string) => {
    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: roomId,
          role: 'member',
          tonnageRange: '1-10' // Default tonnage range
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Başarılı!",
          description: "Odaya başarıyla katıldınız.",
        });
        // Refresh rooms data
        window.location.reload();
      } else {
        toast({
          title: "Hata",
          description: data.error || "Odaya katılırken bir hata oluştu.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Odaya katılırken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  // Delete document handlers
  const handleDeleteClick = (documentId: string) => {
    setDocumentToDelete(documentId);
    setDeleteDialogOpen(true);
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  const confirmDelete = () => {
    if (documentToDelete) {
      deleteDocumentMutation.mutate(documentToDelete);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  // Extract company information
  const company = userData?.profile?.company;
  
  // Calculate statistics with proper type guards
  const rooms = roomsData?.items || [];
  const totalRooms = rooms.length;
  const activeRooms = rooms.filter((room: any) => room.status === 'active').length;
  const userRooms = rooms.filter((room: any) => room.is_member);
  const lrRooms = rooms.filter((room: any) => room.user_role === 'lr');
  const totalKks = kksData?.items?.length || 0;
  const totalDocuments = documentsData?.items?.length || 0;


  // Loading state
  const isLoading = userLoading || roomsLoading || documentsLoading || activitiesLoading;

  return (
    <div className="space-y-8">

      {/* Company Information Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="bg-blue-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-blue-800">Firma Bilgileri</CardTitle>
              </div>
              <Button variant="outline" size="sm" className="border-blue-200 text-blue-700 hover:bg-blue-50" asChild>
                <Link href="/settings">
                  <Edit className="mr-2 h-4 w-4" />
                  Düzenle
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Firma Adı</h4>
                <p className="text-sm">{isLoading ? "Yükleniyor..." : company?.name || "Bilgi bulunamadı"}</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Vergi No</h4>
                <p className="text-sm">{isLoading ? "Yükleniyor..." : company?.vat_number || "Belirtilmemiş"}</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">İletişim</h4>
                <div className="text-sm space-y-1">
                  {isLoading ? (
                    "Yükleniyor..."
                  ) : (
                    <>
                      {company?.contact_email && (
                        <div className="text-blue-600">{company.contact_email}</div>
                      )}
                      {company?.contact_phone && (
                        <div className="text-slate-600">{company.contact_phone}</div>
                      )}
                      {!company?.contact_email && !company?.contact_phone && (
                        <div className="text-slate-500">Belirtilmemiş</div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Adres</h4>
                <p className="text-sm">{isLoading ? "Yükleniyor..." : company?.address || "Belirtilmemiş"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Katıldığım Odalar</CardTitle>
              <Database className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <motion.div 
                className="text-2xl font-bold text-blue-600"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              >
                {isLoading ? "..." : userRooms.length}
              </motion.div>
              <p className="text-xs text-muted-foreground">
                Üye olduğum odalar
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow bg-green-50/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-green-50/50">
              <CardTitle className="text-sm font-medium text-green-800">LR olduğum Odalar</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <motion.div 
                className="text-2xl font-bold text-green-700"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                {isLoading ? "..." : lrRooms.length}
              </motion.div>
              <p className="text-xs text-green-600">
                LR rolünde olduğum odalar
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">Yüklediğim Belgeler</CardTitle>
              <FileText className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <motion.div 
                className="text-2xl font-bold text-purple-600"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              >
                {isLoading ? "..." : totalDocuments}
              </motion.div>
              <p className="text-xs text-muted-foreground">
                Toplam yüklediğim belge
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">KKS Gönderimlerim</CardTitle>
              <Users className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <motion.div 
                className="text-2xl font-bold text-orange-600"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              >
                {isLoading ? "..." : totalKks}
              </motion.div>
              <p className="text-xs text-muted-foreground">
                Gönderdiğim KKS sayısı
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-white data-[state=active]:text-blue-600 transition-all duration-200 hover:scale-105"
          >
            Genel Bakış
          </TabsTrigger>
          <TabsTrigger 
            value="mbdf" 
            className="data-[state=active]:bg-white data-[state=active]:text-green-600 transition-all duration-200 hover:scale-105"
          >
            MBDF Sorgulama
          </TabsTrigger>
          <TabsTrigger 
            value="activities" 
            className="data-[state=active]:bg-white data-[state=active]:text-purple-600 transition-all duration-200 hover:scale-105"
          >
            Aktiviteler
          </TabsTrigger>
          <TabsTrigger 
            value="reports" 
            className="data-[state=active]:bg-white data-[state=active]:text-orange-600 transition-all duration-200 hover:scale-105"
          >
            Belge Yönetimi
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Recent Activities */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="col-span-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Son Aktiviteler</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(activitiesData?.items || []).map((activity, index) => (
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

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
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
                      Yeni MBDF Oluştur
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
        </TabsContent>

        {/* MBDF Search Tab */}
        <TabsContent value="mbdf" className="space-y-4">
          <Card className="border-l-4 border-l-green-500 bg-green-50/20">
            <CardHeader className="bg-green-100/60">
              <CardTitle className="text-green-900">MBDF Sorgulama ve Yönetim</CardTitle>
              <CardDescription className="text-green-700">
                MBDF süreçlerinizi arayın, filtreleyin ve yönetin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Madde adı, CAS numarası veya EC numarası ile ara..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setRoomPage(0); // Reset pagination when searching
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedMembership} onValueChange={(value) => {
                  setSelectedMembership(value);
                  setRoomPage(0); // Reset pagination when filtering
                }}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Üyelik durumu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="member">Üye Olduğum Odalar</SelectItem>
                    <SelectItem value="leader">Lider Olduğum Odalar</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtrele
                </Button>
              </div>

              {/* MBDF Results */}
              <div className="space-y-4">
                {(() => {
                  const filteredRooms = rooms.filter((room: any) => {
                    // If search term exists, show all rooms (for discovery)
                    // If no search term, only show rooms where user is a member
                    if (!searchTerm && !room.is_member) return false;
                    
                    // Membership filter
                    if (selectedMembership === 'member' && (!room.user_role || room.user_role === 'none')) return false;
                    if (selectedMembership === 'leader' && room.user_role !== 'lr') return false;
                    
                    // Search filter
                    if (searchTerm && !room.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
                        !room.substance?.cas_number?.includes(searchTerm) &&
                        !room.substance?.ec_number?.includes(searchTerm)) return false;
                    
                    return true;
                  });
                  
                  const totalPages = Math.ceil(filteredRooms.length / roomsPerPage);
                  const startIndex = roomPage * roomsPerPage;
                  const endIndex = startIndex + roomsPerPage;
                  const paginatedRooms = filteredRooms.slice(startIndex, endIndex);
                  
                  return (
                    <>
                      {paginatedRooms.map((room: any, index: number) => (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ scale: 1.01, y: -1 }}
                  >
                    <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-green-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-lg font-semibold text-slate-800">{room.name}</h3>
                              <Badge 
                                className={
                                  room.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : 
                                  room.status === 'closed' ? 'bg-red-100 text-red-800 border-red-200' : 
                                  'bg-gray-100 text-gray-800 border-gray-200'
                                }
                              >
                                {room.status === 'active' ? 'Aktif' : 
                                 room.status === 'closed' ? 'Kapalı' : 'Arşivlendi'}
                              </Badge>
                              {/* Member indicator - only show if user is a member */}
                              {room.user_role && room.user_role !== 'none' && (
                                <Badge 
                                  variant="outline" 
                                  className={
                                    room.user_role === 'lr'
                                      ? "bg-blue-50 text-blue-700 border-blue-200 text-xs"
                                      : "bg-green-50 text-green-700 border-green-200 text-xs"
                                  }
                                >
                                  {room.user_role === 'lr' ? 'Bu odada lidersiniz' : 'Bu odaya üyesiniz'}
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                              <div>
                                <span className="font-medium">CAS:</span> {room.substance?.cas_number || 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium">EC:</span> {room.substance?.ec_number || 'N/A'}
                              </div>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Users className="h-4 w-4" />
                                <span>{room.member_count || 0} üye</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>{room.updated_at ? new Date(room.updated_at).toLocaleDateString('tr-TR') : 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex flex-col space-y-2">
                              {room.is_member ? (
                                <Button size="sm" variant="outline" asChild className="text-sm">
                                  <Link href={`/mbdf/${room.id}`}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Odayı Görüntüle
                                  </Link>
                                </Button>
                              ) : (
                                <Button 
                                  size="sm" 
                                  variant="default" 
                                  className="text-sm"
                                  onClick={() => handleJoinRoom(room.id)}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Odaya Katıl
                                </Button>
                              )}
                              {room.user_role === 'admin' && (
                                <Button size="sm" variant="outline" className="text-sm">
                                  <Edit className="h-4 w-4 mr-2" />
                                  Düzenle
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                      ))}
                      
                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex justify-center items-center space-x-4 pt-6">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRoomPage(Math.max(0, roomPage - 1))}
                            disabled={roomPage === 0}
                          >
                            Önceki
                          </Button>
                          
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">
                              Sayfa {roomPage + 1} / {totalPages}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({filteredRooms.length} toplam oda)
                            </span>
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRoomPage(Math.min(totalPages - 1, roomPage + 1))}
                            disabled={roomPage >= totalPages - 1}
                          >
                            Sonraki
                          </Button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detaylı Aktivite Geçmişi</CardTitle>
              <CardDescription>
                Tüm sistem aktivitelerinizi görüntüleyin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filter Controls */}
              <div className="flex items-center space-x-4">
                <Select value={activityFilter} onValueChange={setActivityFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Aktivite türü seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Aktiviteler</SelectItem>
                    <SelectItem value="Oluşturma">MBDF Oluşturma</SelectItem>
                    <SelectItem value="Katılım">Odaya Katılım</SelectItem>
                    <SelectItem value="Belge">Belge Yükleme</SelectItem>
                    <SelectItem value="Oylama">Oylama</SelectItem>
                    <SelectItem value="KKS">KKS Gönderme</SelectItem>
                    <SelectItem value="Erişim">Erişim Talepleri</SelectItem>
                    <SelectItem value="Sözleşme">Sözleşmeler</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Activities List */}
              {detailedActivitiesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Aktiviteler yükleniyor...</p>
                </div>
              ) : (detailedActivitiesData?.items || []).length > 0 ? (
                <div className="space-y-4">
                  {(detailedActivitiesData?.items || []).map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
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
                  
                  {/* Pagination */}
                  <div className="flex justify-center space-x-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActivityPage(Math.max(0, activityPage - 1))}
                      disabled={activityPage === 0}
                    >
                      Önceki
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      Sayfa {activityPage + 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActivityPage(activityPage + 1)}
                      disabled={(detailedActivitiesData?.items || []).length < 20}
                    >
                      Sonraki
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Aktivite Bulunamadı</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {activityFilter === "all" 
                      ? "Henüz hiç aktivite bulunmuyor"
                      : `${activityFilter} türünde aktivite bulunmuyor`
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Document Management Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Belge Yönetimi</CardTitle>
              <CardDescription>
                Yüklediğiniz belgeleri yönetin ve takip edin
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documentsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <Skeleton className="h-10 w-10 rounded" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : documentsData?.items && documentsData.items.length > 0 ? (
                <div className="space-y-4">
                  {documentsData.items.map((document: any, index: number) => (
                    <motion.div
                      key={document.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded bg-blue-100 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-none truncate">
                              {document.name}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {document.mbdf_room?.substance?.name || document.mbdf_room?.name || 'Bilinmeyen Oda'} • {new Date(document.created_at).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (document.mbdf_room?.id) {
                                  const url = `/mbdf/${document.mbdf_room.id}?documentId=${document.id}&tab=documents`;
                                  window.location.href = url;
                                }
                              }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(document.id)}
                              className="text-destructive hover:text-destructive/80"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Henüz belge yüklenmemiş</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    İlk belgenizi yüklemek için bir MBDF odasına katılın
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Belgeyi Sil</DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz. Belgeyi silmek istediğinizden emin misiniz?
            </DialogDescription>
          </DialogHeader>
          
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Uyarı:</strong> Bu belge kalıcı olarak silinecektir ve geri alınamaz.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" onClick={cancelDelete}>
              İptal
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteDocumentMutation.isPending}
            >
              {deleteDocumentMutation.isPending ? "Siliniyor..." : "Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
