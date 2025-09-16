"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  FileText, 
  Users,
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Send,
  PenTool,
  Calendar,
  User,
  Building,
  Hash,
  Eye,
  EyeOff,
  Copy
} from "lucide-react";
import { useAgreement, useRequestSignature, useSendKep } from "@/hooks/use-agreements";
import { Skeleton } from "@/components/ui/skeleton";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AgreementDetailContentProps {
  agreementId: string;
}

const agreementTypeLabels = {
  consortium: "Konsorsiyum Anlaşması",
  data_sharing: "Veri Paylaşım Anlaşması", 
  confidentiality: "Gizlilik Anlaşması",
  service: "Hizmet Anlaşması",
  general: "Genel Anlaşma"
};

export function AgreementDetailContent({ agreementId }: AgreementDetailContentProps) {
  const [showFullContent, setShowFullContent] = useState(false);
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Query hooks
  const { data: agreement, isLoading, error } = useAgreement(agreementId);
  const requestSignatureMutation = useRequestSignature();
  const sendKepMutation = useSendKep();

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <Card>
          <CardHeader>
            <div className="space-y-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
              <div className="flex space-x-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardHeader>
        </Card>
        
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
        <p className="text-destructive">Sözleşme bilgileri yüklenirken bir hata oluştu.</p>
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Sözleşme bulunamadı.</p>
      </div>
    );
  }

  const getOverallStatus = () => {
    const totalParties = agreement.agreement_party?.length || 0;
    const signedParties = agreement.agreement_party?.filter(p => p.signature_status === "signed").length || 0;
    
    if (signedParties === totalParties) {
      return { status: "completed", label: "Tamamlandı", variant: "default" as const, icon: CheckCircle };
    } else if (signedParties > 0) {
      return { status: "partial", label: "Kısmi İmzalı", variant: "secondary" as const, icon: Clock };
    } else {
      return { status: "pending", label: "İmza Bekliyor", variant: "outline" as const, icon: AlertCircle };
    }
  };

  const overallStatus = getOverallStatus();

  const handleRequestSignature = () => {
    const partyIds = agreement.agreement_party
      ?.filter(p => p.signature_status === 'pending')
      .map(p => p.id)
      .filter((id): id is string => id !== null) || [];

    requestSignatureMutation.mutate({ agreementId, partyIds });
  };

  const handleSendKEP = () => {
    const kepAddresses = agreement.agreement_party
      ?.map(p => p.profiles?.email)
      .filter(Boolean) || [];

    sendKepMutation.mutate({ 
      agreementId, 
      kepAddresses,
      subject: `MBDF Sözleşmesi: ${agreement.title}`,
      message: `${agreement.title} sözleşmesi KEP sistemi üzerinden bildirilmiştir.`
    });
  };

  const handleDownloadPDF = () => {
    toast({
      title: "PDF indiriliyor",
      description: "Sözleşme PDF formatında indiriliyor...",
    });
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(agreement.content);
    toast({
      title: "Kopyalandı",
      description: "Sözleşme içeriği panoya kopyalandı.",
    });
  };

  const signedParties = agreement.agreement_party?.filter(p => p.signature_status === "signed").length || 0;
  const totalParties = agreement.agreement_party?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{agreement.title}</h1>
                    <p className="text-muted-foreground">{agreement.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Hash className="h-4 w-4" />
                                            <span>ID: {agreementId}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(agreement.created_at || '').toLocaleDateString('tr-TR')}</span>
                  </div>
                  <Badge variant="secondary">
                    {agreementTypeLabels[agreement.agreement_type as keyof typeof agreementTypeLabels]}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={overallStatus.variant} className="text-sm">
                  <overallStatus.icon className="mr-1 h-4 w-4" />
                  {overallStatus.label}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Eylemler
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleRequestSignature}>
                      <PenTool className="mr-2 h-4 w-4" />
                      İmza Talep Et
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSendKEP}>
                      <Send className="mr-2 h-4 w-4" />
                      KEP Gönder
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadPDF}>
                      <Download className="mr-2 h-4 w-4" />
                      PDF İndir
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      Düzenle
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid gap-4 md:grid-cols-3"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">İmza Durumu</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{signedParties}/{totalParties}</div>
            <p className="text-xs text-muted-foreground">
              {signedParties === totalParties ? "Tüm imzalar tamamlandı" : 
               `${totalParties - signedParties} imza bekliyor`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MBDF Odası</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
                            <div className="text-lg font-bold">{agreement.room?.name || "MBDF Odası"}</div>
                <p className="text-xs text-muted-foreground">
                  {agreement.room?.substance?.name || ""} {agreement.room?.substance?.cas_number ? `(${agreement.room.substance.cas_number})` : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oluşturan</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
                            <div className="text-lg font-bold">{agreement.created_by_profile?.full_name || "Bilinmiyor"}</div>
                <p className="text-xs text-muted-foreground">
                  {agreement.created_by_profile?.company?.name || ""}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Tabs defaultValue="content" className="space-y-4">
          <TabsList>
            <TabsTrigger value="content">Sözleşme İçeriği</TabsTrigger>
            <TabsTrigger value="parties">İmza Durumu</TabsTrigger>
            <TabsTrigger value="history">Geçmiş</TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Sözleşme İçeriği</CardTitle>
                    <CardDescription>Anlaşmanın tam metni</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowFullContent(!showFullContent)}
                    >
                      {showFullContent ? (
                        <>
                          <EyeOff className="mr-2 h-4 w-4" />
                          Kısalt
                        </>
                      ) : (
                        <>
                          <Eye className="mr-2 h-4 w-4" />
                          Tümünü Göster
                        </>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopyContent}>
                      <Copy className="mr-2 h-4 w-4" />
                      Kopyala
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap bg-muted/30 p-4 rounded-lg text-sm">
                    {showFullContent 
                      ? agreement.content 
                      : `${agreement.content.substring(0, 500)}...`
                    }
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parties">
            <Card>
              <CardHeader>
                <CardTitle>İmza Durumu</CardTitle>
                <CardDescription>
                  Sözleşme taraflarının imza durumları
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(agreement.agreement_party || []).map((party, index) => (
                    <motion.div
                      key={party.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.1 }}
                      className="flex items-center space-x-4 p-4 border rounded-lg"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>
                          {party.profiles?.full_name
                            ? party.profiles.full_name
                                .split(" ")
                                .map(n => n[0])
                                .join("")
                                .toUpperCase()
                            : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold">{party.profiles?.full_name || "Kullanıcı"}</h3>
                        <p className="text-sm text-muted-foreground">{party.profiles?.email || ""}</p>
                        <p className="text-sm text-muted-foreground">{party.profiles?.company?.name || ""}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge 
                          variant={
                            party.signature_status === "signed" ? "default" :
                            party.signature_status === "pending" ? "outline" : "destructive"
                          }
                        >
                          {party.signature_status === "signed" && <CheckCircle className="mr-1 h-3 w-3" />}
                          {party.signature_status === "pending" && <Clock className="mr-1 h-3 w-3" />}
                          {party.signature_status === "rejected" && <AlertCircle className="mr-1 h-3 w-3" />}
                          {party.signature_status === "signed" ? "İmzalandı" :
                           party.signature_status === "pending" ? "Bekliyor" : "Reddedildi"}
                        </Badge>
                        {party.signed_at && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(party.signed_at).toLocaleDateString('tr-TR')} {new Date(party.signed_at).toLocaleTimeString('tr-TR')}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Anlaşma Geçmişi</CardTitle>
                <CardDescription>
                  Sözleşmeye yapılan işlemlerin geçmişi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4 p-4 border-l-4 border-green-500 bg-green-50 rounded-r-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-900">Mehmet Özkan sözleşmeyi imzaladı</h4>
                      <p className="text-sm text-green-700">3 Şubat 2024, 09:15</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 p-4 border-l-4 border-green-500 bg-green-50 rounded-r-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-900">Ahmet Yılmaz sözleşmeyi imzaladı</h4>
                      <p className="text-sm text-green-700">2 Şubat 2024, 14:30</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 p-4 border-l-4 border-blue-500 bg-blue-50 rounded-r-lg">
                    <Send className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900">İmza talebi gönderildi</h4>
                      <p className="text-sm text-blue-700">1 Şubat 2024, 10:30</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 p-4 border-l-4 border-gray-500 bg-gray-50 rounded-r-lg">
                    <FileText className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Sözleşme oluşturuldu</h4>
                      <p className="text-sm text-gray-700">1 Şubat 2024, 10:00</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}