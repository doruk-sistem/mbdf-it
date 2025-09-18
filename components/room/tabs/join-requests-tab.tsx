"use client";

import { useState } from "react";
import { Check, X, Clock, UserPlus, Building2, Calendar, MessageSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";  
import { useJoinRequests, useUpdateJoinRequest } from "@/hooks/use-join-requests";
import { useMembers } from "@/hooks/use-members";


interface JoinRequestsTabProps {
  roomId: string;
  isArchived?: boolean;
}

export function JoinRequestsTab({ roomId, isArchived = false }: JoinRequestsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const [decisionNote, setDecisionNote] = useState("");
  const [pendingDecision, setPendingDecision] = useState<'approve' | 'reject' | null>(null);

  const { toast } = useToast();

  // Query hooks
  const { data: joinRequestsData, isLoading, error } = useJoinRequests(roomId);
  const { data: membersData } = useMembers(roomId);
  const updateJoinRequestMutation = useUpdateJoinRequest();

  // Extract data
  const joinRequests = joinRequestsData?.requests || [];
  const currentUserRole = (membersData as any)?.currentUserRole;

  // Filter requests based on search term
  const filteredRequests = joinRequests.filter((request: any) =>
    request.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.profiles?.company?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // All authenticated users can manage join requests
  const canManageRequests = true;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="mr-1 h-3 w-3" />Beklemede</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><Check className="mr-1 h-3 w-3" />Onaylandı</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600"><X className="mr-1 h-3 w-3" />Reddedildi</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-gray-600 border-gray-600">İptal Edildi</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDecision = async (requestId: string, decision: 'approve' | 'reject') => {
    setSelectedRequest(joinRequests.find((r: any) => r.request_id === requestId));
    setPendingDecision(decision);
    setDecisionNote("");
    setDecisionDialogOpen(true);
  };

  const confirmDecision = async () => {
    if (!selectedRequest || !pendingDecision) return;

    try {
      await updateJoinRequestMutation.mutateAsync({
        id: selectedRequest.request_id,
        data: {
          status: pendingDecision === 'approve' ? 'approved' : 'rejected',
          decisionNote: decisionNote || undefined,
        },
      });

      toast({
        title: "Başarılı",
        description: `Katılım talebi ${pendingDecision === 'approve' ? 'onaylandı' : 'reddedildi'}.`,
      });

      setDecisionDialogOpen(false);
      setSelectedRequest(null);
      setPendingDecision(null);
      setDecisionNote("");
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error?.data?.message || "İşlem sırasında bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Katılım Talepleri</h3>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Katılım Talepleri</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-sm text-destructive">Katılım talepleri yüklenirken bir hata oluştu.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Katılım Talepleri</h3>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Talep ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
      </div>

      {!canManageRequests ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            Katılım taleplerini görüntülemek için oda üyesi olmanız gerekiyor. Eğer odada bir lider varsa, sadece lider katılım taleplerini yönetebilir.
          </p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-8">
          <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {searchTerm ? "Arama kriterlerinize uygun katılım talebi bulunamadı." : "Henüz katılım talebi bulunmuyor."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request: any) => (
            <Card key={request.request_id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={request.profiles?.avatar_url} />
                      <AvatarFallback>
                        {request.profiles?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-2">
                      <div>
                        <h4 className="font-semibold">{request.profiles?.full_name || 'Bilinmeyen Kullanıcı'}</h4>
                        <p className="text-sm text-muted-foreground">{request.profiles?.email}</p>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Building2 className="h-4 w-4" />
                          <span>{request.profiles?.company?.name || 'Şirket bilgisi yok'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(request.created_at).toLocaleDateString('tr-TR')}</span>
                        </div>
                      </div>
                      
                      {request.message && (
                        <div className="flex items-start space-x-1">
                          <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">{request.message}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(request.status)}
                    
                    {request.status === 'pending' && canManageRequests && !isArchived && (
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => handleDecision(request.request_id, 'approve')}
                          disabled={updateJoinRequestMutation.isPending}
                        >
                          <Check className="mr-1 h-4 w-4" />
                          Onayla
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => handleDecision(request.request_id, 'reject')}
                          disabled={updateJoinRequestMutation.isPending}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Reddet
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                {request.decision_note && (
                  <>
                    <Separator className="my-4" />
                    <div className="text-sm">
                      <p className="font-medium text-muted-foreground mb-1">Karar Notu:</p>
                      <p className="text-muted-foreground">{request.decision_note}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Decision Dialog */}
      <Dialog open={decisionDialogOpen} onOpenChange={setDecisionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingDecision === 'approve' ? 'Katılım Talebini Onayla' : 'Katılım Talebini Reddet'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  <strong>{selectedRequest.profiles?.full_name}</strong> kullanıcısının katılım talebini{' '}
                  {pendingDecision === 'approve' ? 'onaylamak' : 'reddetmek'} istediğinizi onaylıyor musunuz?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="decision-note">Karar Notu (İsteğe bağlı)</Label>
              <Textarea
                id="decision-note"
                placeholder="Kararınızla ilgili bir not ekleyebilirsiniz..."
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setDecisionDialogOpen(false)}
                disabled={updateJoinRequestMutation.isPending}
              >
                İptal
              </Button>
              <Button
                onClick={confirmDecision}
                disabled={updateJoinRequestMutation.isPending}
                className={pendingDecision === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {updateJoinRequestMutation.isPending ? 'İşleniyor...' : (pendingDecision === 'approve' ? 'Onayla' : 'Reddet')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
