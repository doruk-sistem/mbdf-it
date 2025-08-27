"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  FileText, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Users,
  Eye,
  Send,
  PenTool
} from "lucide-react";
import { useAgreements, useCreateAgreement, useRequestSignature, useSendKep } from "@/hooks/use-agreements";
import { useMemberRooms } from "@/hooks/use-rooms";
import { AgreementsSkeleton } from "./agreements-skeleton";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";

export function AgreementsContent() {
  const [mounted, setMounted] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [createFormData, setCreateFormData] = useState({
    title: "",
    description: "",
    content: "",
    agreement_type: "",
    room_id: "",
    party_ids: [] as string[]
  });
  const { toast } = useToast();

  // Query hooks
  const { data: agreementsData, isLoading, error } = useAgreements();
  const { data: roomsData } = useMemberRooms();
  const createAgreementMutation = useCreateAgreement();
  const requestSignatureMutation = useRequestSignature();
  const sendKepMutation = useSendKep();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (isLoading) {
    return <AgreementsSkeleton />;
  }

  const agreements = agreementsData?.items || [];
  const rooms = roomsData?.items || [];

  // Calculate stats from actual data
  const stats = {
    total: agreements.length,
    pending: agreements.filter(agreement => {
      const parties = agreement.agreement_party || [];
      const signedCount = parties.filter(p => p.signature_status === 'signed').length;
      return signedCount < parties.length && signedCount === 0;
    }).length,
    signed: agreements.filter(agreement => {
      const parties = agreement.agreement_party || [];
      const signedCount = parties.filter(p => p.signature_status === 'signed').length;
      return signedCount === parties.length && parties.length > 0;
    }).length,
    draft: agreements.filter(agreement => {
      const parties = agreement.agreement_party || [];
      return parties.length === 0;
    }).length
  };

  const getStatusBadge = (parties: any[]) => {
    const totalParties = parties.length;
    const signedParties = parties.filter(p => p.signature_status === "signed").length;
    
    if (totalParties === 0) {
      return <Badge variant="outline"><AlertCircle className="mr-1 h-3 w-3" />Taslak</Badge>;
    } else if (signedParties === totalParties) {
      return <Badge variant="default"><CheckCircle className="mr-1 h-3 w-3" />Tamamlandı</Badge>;
    } else if (signedParties > 0) {
      return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Kısmi İmzalı</Badge>;
    } else {
      return <Badge variant="outline"><AlertCircle className="mr-1 h-3 w-3" />Bekliyor</Badge>;
    }
  };

  const getProgressText = (parties: any[]) => {
    const totalParties = parties.length;
    const signedParties = parties.filter(p => p.signature_status === "signed").length;
    return totalParties === 0 ? "Taslak" : `${signedParties}/${totalParties} imza`;
  };

  const handleCreateAgreement = () => {
    if (!createFormData.title || !createFormData.agreement_type || !createFormData.room_id) {
      toast({
        title: "Eksik bilgi",
        description: "Lütfen tüm gerekli alanları doldurun.",
        variant: "destructive",
      });
      return;
    }

    createAgreementMutation.mutate({
      ...createFormData,
      party_ids: createFormData.party_ids
    });
    setIsCreateDialogOpen(false);
    setCreateFormData({
      title: "",
      description: "",
      content: "",
      agreement_type: "",
      room_id: "",
      party_ids: []
    });
  };

  const handleRequestPenTool = (agreementId: string) => {
    const agreement = agreements.find(a => a.id === agreementId);
    if (!agreement) return;

    const partyIds = agreement.agreement_party
      .filter(p => p.signature_status === 'pending')
      .map(p => p.id);

    requestSignatureMutation.mutate({ agreementId, partyIds });
  };

  const handleSendKEP = (agreementId: string) => {
    const agreement = agreements.find(a => a.id === agreementId);
    if (!agreement) return;

    const kepAddresses = agreement.agreement_party
      .map(p => p.profiles?.email)
      .filter(Boolean);

    sendKepMutation.mutate({ 
      agreementId, 
      kepAddresses,
      subject: `MBDF Sözleşmesi: ${agreement.title}`,
      message: `${agreement.title} sözleşmesi KEP sistemi üzerinden bildirilmiştir.`
    });
  };

  const filteredAgreements = agreements.filter(agreement => {
    if (filterStatus === "all") return true;
    
    const parties = agreement.agreement_party || [];
    const signedCount = parties.filter(p => p.signature_status === "signed").length;
    
    switch (filterStatus) {
      case "completed":
        return signedCount === parties.length && parties.length > 0;
      case "pending":
        return signedCount < parties.length && signedCount === 0;
      case "partial":
        return signedCount > 0 && signedCount < parties.length;
      default:
        return true;
    }
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
            <p className="text-xs text-muted-foreground">Tüm sözleşmeler</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bekleyen</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">İmza bekliyor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">İmzalanan</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.signed}</div>
            <p className="text-xs text-muted-foreground">Tamamlanan</p>
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
      </motion.div>

      {/* Agreements List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sözleşmeler</CardTitle>
                <CardDescription>Tüm MBDF sözleşmeleri ve imza durumları</CardDescription>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Yeni Sözleşme
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Yeni Sözleşme Oluştur</DialogTitle>
                    <DialogDescription>
                      Yeni bir MBDF sözleşmesi oluşturun.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Başlık</Label>
                      <Input 
                        id="title" 
                        placeholder="Sözleşme başlığı..." 
                        value={createFormData.title}
                        onChange={(e) => setCreateFormData(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="type">Tür</Label>
                      <Select 
                        value={createFormData.agreement_type} 
                        onValueChange={(value) => setCreateFormData(prev => ({ ...prev, agreement_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sözleşme türünü seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="consortium">Konsorsiyum Anlaşması</SelectItem>
                          <SelectItem value="data_sharing">Veri Paylaşım Anlaşması</SelectItem>
                          <SelectItem value="confidentiality">Gizlilik Anlaşması</SelectItem>
                          <SelectItem value="service">Hizmet Anlaşması</SelectItem>
                        </SelectContent>
                      </Select>
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
                            <SelectItem key={room.id} value={room.id}>
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
                        placeholder="Sözleşme açıklaması..."
                        className="resize-none"
                        value={createFormData.description}
                        onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="content">Sözleşme İçeriği</Label>
                      <Textarea
                        id="content"
                        placeholder="Sözleşme metnini girin..."
                        className="resize-none min-h-[120px]"
                        value={createFormData.content}
                        onChange={(e) => setCreateFormData(prev => ({ ...prev, content: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      İptal
                    </Button>
                    <Button 
                      onClick={handleCreateAgreement}
                      disabled={createAgreementMutation.isPending}
                    >
                      {createAgreementMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
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
                  <SelectItem value="completed">Tamamlanan</SelectItem>
                  <SelectItem value="partial">Kısmi İmzalı</SelectItem>
                  <SelectItem value="pending">Bekleyen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Agreements */}
            <div className="space-y-4">
              {isLoading && <AgreementsSkeleton />}
              
              {!isLoading && filteredAgreements.map((agreement, index) => (
                <motion.div
                  key={agreement.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.1 }}
                >
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <FileText className="h-8 w-8 text-primary" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg">{agreement.title}</h3>
                            {getStatusBadge(agreement.agreement_party || [])}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {agreement.description || "Açıklama bulunmuyor"}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>Oda: {agreement.room?.name || "Bilinmiyor"}</span>
                            <span>•</span>
                            <span>Oluşturan: {agreement.created_by_profile?.full_name || "Bilinmiyor"}</span>
                            <span>•</span>
                            <span>Tarih: {new Date(agreement.created_at).toLocaleDateString('tr-TR')}</span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {getProgressText(agreement.agreement_party || [])}
                              </span>
                            </div>
                            <div className="flex -space-x-2">
                              {(agreement.agreement_party || []).slice(0, 3).map((party, i) => (
                                <Avatar key={party.id} className="h-6 w-6 border-2 border-background">
                                  <AvatarFallback className="text-xs">
                                    {(party.profiles?.full_name || "U")
                                      .split(" ")
                                      .map(n => n[0])
                                      .join("")
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {(agreement.agreement_party || []).length > 3 && (
                                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                                  <span className="text-xs text-muted-foreground">
                                    +{(agreement.agreement_party || []).length - 3}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/agreements/${agreement.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Görüntüle
                            </Link>
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
                              <DropdownMenuItem 
                                onClick={() => handleRequestPenTool(agreement.id)}
                                disabled={requestSignatureMutation.isPending}
                              >
                                <PenTool className="mr-2 h-4 w-4" />
                                İmza Talep Et
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleSendKEP(agreement.id)}
                                disabled={sendKepMutation.isPending}
                              >
                                <Send className="mr-2 h-4 w-4" />
                                KEP Gönder
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                Düzenle
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {error && (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                <h3 className="mt-4 text-lg font-semibold text-destructive">Hata Oluştu</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sözleşmeler yüklenirken bir hata oluştu.
                </p>
              </div>
            )}

            {!error && filteredAgreements.length === 0 && (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Sözleşme bulunamadı</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {filterStatus === "all" 
                    ? "Henüz sözleşme oluşturulmamış." 
                    : "Seçilen filtreye uygun sözleşme bulunamadı."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}