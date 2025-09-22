"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Send, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText,
  Download,
  Upload,
  Eye,
  Archive
} from "lucide-react";
import { useKKSSubmissions, useCreateKKSSubmission, useGenerateEvidence, useSendKKS } from "@/hooks/use-kks";
import { useRooms } from "@/hooks/use-rooms";
import { KKSSkeleton } from "./kks-skeleton";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";


export function KKSContent() {
  const [mounted, setMounted] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [createFormData, setCreateFormData] = useState({
    title: "",
    description: "",
    submission_data: {},
    room_id: ""
  });
  const { toast } = useToast();

  // Query hooks
  const { data: submissionsData, isLoading, error } = useKKSSubmissions();
  const { data: roomsData } = useRooms();
  const createSubmissionMutation = useCreateKKSSubmission();
  const generateEvidenceMutation = useGenerateEvidence();
  const sendKKSMutation = useSendKKS();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (isLoading) {
    return <KKSSkeleton />;
  }

  const submissions = submissionsData?.items || [];
  const rooms = roomsData?.items || [];

  // Calculate stats from actual data
  const stats = {
    total: submissions.length,
    draft: submissions.filter(s => s.status === 'draft').length,
    submitted: submissions.filter(s => s.status === 'submitted').length,
    sent: submissions.filter(s => s.status === 'sent').length
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline"><AlertCircle className="mr-1 h-3 w-3" />Taslak</Badge>;
      case "submitted":
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Gönderildi</Badge>;
      case "sent":
        return <Badge variant="default"><CheckCircle className="mr-1 h-3 w-3" />KKS'ye İletildi</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCreateSubmission = () => {
    if (!createFormData.title || !createFormData.room_id) {
      toast({
        title: "Eksik bilgi",
        description: "Lütfen tüm gerekli alanları doldurun.",
        variant: "destructive",
      });
      return;
    }

    createSubmissionMutation.mutate({
      ...createFormData,
      submission_data: createFormData.submission_data || {}
    });
    setIsCreateDialogOpen(false);
    setCreateFormData({
      title: "",
      description: "",
      submission_data: {},
      room_id: ""
    });
  };

  const handleGenerateEvidence = (submissionId: string, fileType: 'pdf' | 'xml' | 'json' = 'pdf') => {
    generateEvidenceMutation.mutate({ submissionId, fileType });
  };

  const handleSendToKKS = (submissionId: string) => {
    sendKKSMutation.mutate({ 
      submissionId,
      officialSend: true
    });
  };

  const handleDownloadEvidence = (submissionId: string, fileType: string) => {
    toast({
      title: "Dosya indiriliyor",
      description: `${fileType.toUpperCase()} dosyası indiriliyor...`,
    });
  };

  const filteredSubmissions = submissions.filter(submission => {
    if (filterStatus === "all") return true;
    return submission.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid gap-4 md:grid-cols-4"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Tüm gönderimler</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taslak</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
            <p className="text-xs text-muted-foreground">Hazırlanıyor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gönderildi</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.submitted}</div>
            <p className="text-xs text-muted-foreground">İşleme alındı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamamlanan</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sent}</div>
            <p className="text-xs text-muted-foreground">KKS'ye iletildi</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Submissions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>KKS Gönderimler</CardTitle>
                <CardDescription>Tüm KKS gönderimlerini yönetin</CardDescription>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Yeni Gönderim
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Yeni KKS Gönderimi</DialogTitle>
                    <DialogDescription>
                      Yeni bir KKS gönderimi oluşturun.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Başlık</Label>
                      <Input 
                        id="title" 
                        placeholder="Gönderim başlığı..." 
                        value={createFormData.title}
                        onChange={(e) => setCreateFormData(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="room">MBDF Odası</Label>
                      <Select
                        value={createFormData.room_id}
                        onValueChange={(value) => setCreateFormData(prev => ({ ...prev, room_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Oda seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {rooms.map((room) => (
                            <SelectItem key={room.id} value={room.id || ''}>
                              {room.name} - {room.substance?.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Açıklama</Label>
                      <Textarea
                        id="description"
                        placeholder="Gönderim açıklaması..."
                        className="resize-none"
                        value={createFormData.description}
                        onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="data">Gönderim Verisi (JSON)</Label>
                      <Textarea
                        id="data"
                        placeholder="JSON formatında gönderim verisini girin..."
                        className="resize-none font-mono text-sm min-h-[120px]"
                        value={JSON.stringify(createFormData.submission_data, null, 2)}
                        onChange={(e) => {
                          try {
                            const data = e.target.value ? JSON.parse(e.target.value) : {};
                            setCreateFormData(prev => ({ ...prev, submission_data: data }));
                          } catch {
                            // Invalid JSON, keep the text as is for user to fix
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      İptal
                    </Button>
                    <Button 
                      onClick={handleCreateSubmission}
                      disabled={createSubmissionMutation.isPending}
                    >
                      {createSubmissionMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex items-center space-x-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Durum filtrele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="draft">Taslak</SelectItem>
                  <SelectItem value="submitted">Gönderildi</SelectItem>
                  <SelectItem value="sent">Tamamlanan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submissions */}
            <div className="space-y-4">
              {error && (
                <div className="text-center py-12">
                  <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                  <h3 className="mt-4 text-lg font-semibold text-destructive">Hata Oluştu</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    KKS gönderimler yüklenirken bir hata oluştu.
                  </p>
                </div>
              )}
              
              {!error && filteredSubmissions.map((submission, index) => (
                <motion.div
                  key={submission.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.1 }}
                >
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Send className="h-8 w-8 text-primary" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg">{submission.title}</h3>
                            {getStatusBadge(submission.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {submission.description}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>Oda: {submission.room?.name || "Bilinmiyor"}</span>
                            <span>•</span>
                            <span>Madde: {submission.room?.substance?.name || "Bilinmiyor"}</span>
                            <span>•</span>
                            <span>Oluşturan: {submission.created_by_profile?.full_name || "Bilinmiyor"}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>Oluşturulma: {new Date(submission.created_at || '').toLocaleDateString('tr-TR')}</span>
                            {submission.submitted_at && (
                              <>
                                <span>•</span>
                                <span>Gönderim: {new Date(submission.submitted_at).toLocaleDateString('tr-TR')}</span>
                              </>
                            )}
                            {submission.sent_at && (
                              <>
                                <span>•</span>
                                <span>KKS İletim: {new Date(submission.sent_at).toLocaleDateString('tr-TR')}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            Görüntüle
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon">
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 5v.01M12 12v.01M12 19v.01"
                                  />
                                </svg>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {submission.status === "draft" && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => handleGenerateEvidence(submission.id!)}
                                    disabled={generateEvidenceMutation.isPending}
                                  >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Kanıt Dosyaları Oluştur
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {submission.status === "submitted" && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => handleSendToKKS(submission.id!)}
                                    disabled={sendKKSMutation.isPending}
                                  >
                                    <Send className="mr-2 h-4 w-4" />
                                    KKS'ye Gönder
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {(submission.status === "submitted" || submission.status === "sent") && (
                                <>
                                  <DropdownMenuItem onClick={() => handleDownloadEvidence(submission.id!, "csv")}>
                                    <Download className="mr-2 h-4 w-4" />
                                    CSV İndir
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDownloadEvidence(submission.id!, "pdf")}>
                                    <Download className="mr-2 h-4 w-4" />
                                    PDF İndir
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem>
                                Düzenle
                              </DropdownMenuItem>
                              {submission.status === "draft" && (
                                <DropdownMenuItem className="text-destructive">
                                  <Archive className="mr-2 h-4 w-4" />
                                  Sil
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {!error && filteredSubmissions.length === 0 && (
              <div className="text-center py-12">
                <Send className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Gönderim bulunamadı</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {filterStatus === "all" 
                    ? "Henüz KKS gönderimi oluşturulmamış." 
                    : "Seçilen filtreye uygun gönderim bulunamadı."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}