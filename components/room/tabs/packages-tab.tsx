"use client";

import { useState } from "react";
import { Package, Plus, Users, Clock, Check, X } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface PackagesTabProps {
  roomId: string;
}

// Mock data
const mockPackages = [
  {
    id: "1",
    name: "Temel Veri Paketi",
    description: "Benzene için temel veriler ve güvenlik bilgileri",
    created_at: "2024-01-20T10:00:00Z"
  },
  {
    id: "2", 
    name: "Genişletilmiş Analiz Paketi",
    description: "Detaylı toksisite ve çevre etki analizleri",
    created_at: "2024-02-01T14:30:00Z"
  }
];

const mockAccessRequests = [
  {
    id: "1",
    package_name: "Temel Veri Paketi",
    requester: {
      full_name: "Mehmet Özkan",
      email: "mehmet@demir.com",
      company: { name: "Demir A.Ş." }
    },
    status: "pending",
    justification: "Ürün güvenlik değerlendirmesi için gerekli",
    created_at: "2024-02-10T09:30:00Z"
  },
  {
    id: "2",
    package_name: "Genişletilmiş Analiz Paketi", 
    requester: {
      full_name: "Zeynep Yılmaz",
      email: "zeynep@petrol.com",
      company: { name: "Petrol Kımya" }
    },
    status: "approved",
    justification: "Çevre risk değerlendirmesi çalışması",
    created_at: "2024-02-08T11:15:00Z",
    approved_at: "2024-02-09T16:45:00Z"
  }
];

export function PackagesTab({ roomId }: PackagesTabProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Bekliyor</Badge>;
      case "approved":
        return <Badge variant="default"><Check className="mr-1 h-3 w-3" />Onaylandı</Badge>;
      case "rejected":
        return <Badge variant="destructive"><X className="mr-1 h-3 w-3" />Reddedildi</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleCreatePackage = () => {
    setIsCreateDialogOpen(false);
    toast({
      title: "Paket oluşturuldu",
      description: "Erişim paketi başarıyla oluşturuldu.",
    });
  };

  const handleApproveRequest = (requestId: string) => {
    toast({
      title: "İstek onaylandı",
      description: "Erişim isteği onaylandı ve kullanıcıya bilgilendirme e-postası gönderildi.",
    });
  };

  const handleRejectRequest = (requestId: string) => {
    toast({
      title: "İstek reddedildi", 
      description: "Erişim isteği reddedildi.",
      variant: "destructive",
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Packages */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Erişim Paketleri</CardTitle>
              <CardDescription>
                Mevcut veri paketleri
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Yeni Paket
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni Erişim Paketi</DialogTitle>
                  <DialogDescription>
                    Yeni bir erişim paketi oluşturun.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="package-name">Paket Adı</Label>
                    <Input id="package-name" placeholder="Paket adını girin..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="package-description">Açıklama</Label>
                    <Textarea 
                      id="package-description" 
                      placeholder="Paket açıklaması..."
                      className="resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="package-data">Paket Verisi</Label>
                    <Textarea 
                      id="package-data" 
                      placeholder="JSON formatında paket verisini girin..."
                      className="resize-none font-mono text-sm"
                      rows={4}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button onClick={handleCreatePackage}>
                    Oluştur
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockPackages.map((pkg) => (
            <Card key={pkg.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{pkg.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {pkg.description}
                    </CardDescription>
                  </div>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Oluşturulma: {new Date(pkg.created_at).toLocaleDateString('tr-TR')}</span>
                  <Button variant="outline" size="sm">
                    Düzenle
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {mockPackages.length === 0 && (
            <div className="text-center py-8">
              <Package className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Henüz paket oluşturulmamış</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Access Requests */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Erişim İstekleri</CardTitle>
            <CardDescription>
              Bekleyen ve onaylanan istekler
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockAccessRequests.map((request) => (
            <Card key={request.id} className="bg-muted/20">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {request.requester.full_name
                            .split(" ")
                            .map(n => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{request.requester.full_name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{request.requester.company.name}</p>
                    <Badge variant="outline" className="text-xs">
                      {request.package_name}
                    </Badge>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div>
                  <p className="text-sm font-medium">Gerekçe:</p>
                  <p className="text-sm text-muted-foreground">{request.justification}</p>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  İstek tarihi: {new Date(request.created_at).toLocaleDateString('tr-TR')}
                  {request.approved_at && (
                    <span> • Onay tarihi: {new Date(request.approved_at).toLocaleDateString('tr-TR')}</span>
                  )}
                </div>

                {request.status === "pending" && (
                  <div className="flex space-x-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => handleApproveRequest(request.id)}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Onayla
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleRejectRequest(request.id)}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Reddet
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {mockAccessRequests.length === 0 && (
            <div className="text-center py-8">
              <Users className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Henüz erişim isteği yok</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}