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

// Mock data
const mockStats = {
  total: 8,
  draft: 2,
  submitted: 4,
  sent: 2
};

const mockSubmissions = [
  {
    id: "1",
    title: "Benzene MBDF 2024 Veri Gönderimi",
    description: "2024 yılı benzene MBDF verileri",
    room: { 
      name: "Benzene MBDF",
      substance: { name: "Benzene", ec_number: "200-753-7" }
    },
    status: "sent",
    created_by: { full_name: "Ahmet Yılmaz" },
    created_at: "2024-01-15T10:00:00Z",
    submitted_at: "2024-01-20T14:30:00Z",
    sent_at: "2024-01-22T09:15:00Z",
    confirmation_number: "KKS_2024_001_BZ"
  },
  {
    id: "2",
    title: "Toluene MBDF Q1 2024",
    description: "Toluene için Q1 2024 dönem raporu",
    room: {
      name: "Toluene MBDF", 
      substance: { name: "Toluene", ec_number: "203-625-9" }
    },
    status: "submitted",
    created_by: { full_name: "Fatma Kaya" },
    created_at: "2024-02-01T11:00:00Z",
    submitted_at: "2024-02-05T16:45:00Z",
    sent_at: null,
    confirmation_number: null
  },
  {
    id: "3",
    title: "Benzene Güvenlik Değerlendirmesi",
    description: "Güncellenmiş güvenlik değerlendirme raporu",
    room: {
      name: "Benzene MBDF",
      substance: { name: "Benzene", ec_number: "200-753-7" }
    },
    status: "draft",
    created_by: { full_name: "Mehmet Özkan" },
    created_at: "2024-02-10T09:30:00Z",
    submitted_at: null,
    sent_at: null,
    confirmation_number: null
  }
];

export function KKSContent() {
  const [mounted, setMounted] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

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
    setIsCreateDialogOpen(false);
    toast({
      title: "KKS gönderimi oluşturuldu",
      description: "Yeni KKS gönderimi başarıyla oluşturuldu.",
    });
  };

  const handleGenerateEvidence = (submissionId: string) => {
    toast({
      title: "Kanıt dosyaları oluşturuluyor",
      description: "CSV ve PDF kanıt dosyaları oluşturuluyor...",
    });
  };

  const handleSendToKKS = (submissionId: string) => {
    toast({
      title: "KKS'ye gönderiliyor", 
      description: "Gönderim KKS sistemine iletiliyor...",
    });
  };

  const handleDownloadEvidence = (submissionId: string, fileType: string) => {
    toast({
      title: "Dosya indiriliyor",
      description: `${fileType.toUpperCase()} dosyası indiriliyor...`,
    });
  };

  const filteredSubmissions = mockSubmissions.filter(submission => {
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
            <div className="text-2xl font-bold">{mockStats.total}</div>
            <p className="text-xs text-muted-foreground">Tüm gönderimler</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taslak</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.draft}</div>
            <p className="text-xs text-muted-foreground">Hazırlanıyor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gönderildi</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.submitted}</div>
            <p className="text-xs text-muted-foreground">İşleme alındı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamamlanan</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.sent}</div>
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
                      <Input id="title" placeholder="Gönderim başlığı..." />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="room">MBDF Odası</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Oda seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Benzene MBDF</SelectItem>
                          <SelectItem value="2">Toluene MBDF</SelectItem>
                          <SelectItem value="3">Acetone MBDF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Açıklama</Label>
                      <Textarea
                        id="description"
                        placeholder="Gönderim açıklaması..."
                        className="resize-none"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="data">Gönderim Verisi (JSON)</Label>
                      <Textarea
                        id="data"
                        placeholder="JSON formatında gönderim verisini girin..."
                        className="resize-none font-mono text-sm min-h-[120px]"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      İptal
                    </Button>
                    <Button onClick={handleCreateSubmission}>
                      Oluştur
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
              {filteredSubmissions.map((submission, index) => (
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
                            <span>Oda: {submission.room.name}</span>
                            <span>•</span>
                            <span>Madde: {submission.room.substance.name}</span>
                            <span>•</span>
                            <span>Oluşturan: {submission.created_by.full_name}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>Oluşturulma: {new Date(submission.created_at).toLocaleDateString('tr-TR')}</span>
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
                          {submission.confirmation_number && (
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {submission.confirmation_number}
                              </Badge>
                            </div>
                          )}
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
                                  <DropdownMenuItem onClick={() => handleGenerateEvidence(submission.id)}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Kanıt Dosyaları Oluştur
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {submission.status === "submitted" && (
                                <>
                                  <DropdownMenuItem onClick={() => handleSendToKKS(submission.id)}>
                                    <Send className="mr-2 h-4 w-4" />
                                    KKS'ye Gönder
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {(submission.status === "submitted" || submission.status === "sent") && (
                                <>
                                  <DropdownMenuItem onClick={() => handleDownloadEvidence(submission.id, "csv")}>
                                    <Download className="mr-2 h-4 w-4" />
                                    CSV İndir
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDownloadEvidence(submission.id, "pdf")}>
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

            {filteredSubmissions.length === 0 && (
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