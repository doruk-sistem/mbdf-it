"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, FlaskConical, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useSubstances } from "@/hooks/use-substances";
import { Substance } from "@/lib/schemas";

interface SubstanceSelectionCardProps {
  userEmail: string;
  onComplete: () => void;
}

export function SubstanceSelectionCard({ userEmail, onComplete }: SubstanceSelectionCardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubstance, setSelectedSubstance] = useState<Substance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  
  const { data: substancesData, isLoading: substancesLoading, error } = useSubstances();
  const { toast } = useToast();
  const router = useRouter();

  // Filter substances based on search term
  const filteredSubstances = substancesData?.items?.filter(substance => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      substance.name.toLowerCase().includes(searchLower) ||
      substance.cas_number?.toLowerCase().includes(searchLower) ||
      substance.ec_number?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const handleSubstanceSelect = (substance: Substance) => {
    setSelectedSubstance(substance);
    setShowCreateRoom(false);
  };

  const handleJoinExistingRoom = async () => {
    if (!selectedSubstance) return;

    setIsLoading(true);
    try {
      // Check if room exists for this substance
      const response = await fetch(`/api/rooms?substance_id=${selectedSubstance.id}`);
      const data = await response.json();

      if (data.success && data.items && data.items.length > 0) {
        // Room exists, join it
        const room = data.items[0]; // Take the first active room
        
        const joinResponse = await fetch('/api/members', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomId: room.id,
            userEmail: userEmail,
            role: 'member'
          }),
        });

        const joinData = await joinResponse.json();

        if (joinData.success) {
          toast({
            title: "Başarılı!",
            description: `${selectedSubstance.name} odasına başarıyla katıldınız.`,
          });
          onComplete();
        } else {
          toast({
            title: "Hata",
            description: joinData.error || "Odaya katılırken bir hata oluştu.",
            variant: "destructive",
          });
        }
      } else {
        // No room exists, show create room option
        setShowCreateRoom(true);
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Bir hata oluştu. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewRoom = () => {
    if (!selectedSubstance) return;
    
    // Redirect to create room page with pre-selected substance
    router.push(`/create-room?substance_id=${selectedSubstance.id}`);
  };

  // Skip function removed - substance selection is now required

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FlaskConical className="h-5 w-5" />
            <span>Madde Seçimi</span>
          </CardTitle>
          <CardDescription>
            Madde bilgileri yüklenirken bir hata oluştu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Madde listesi yüklenemedi. Lütfen sayfayı yenileyin.
            </p>
            <Button onClick={() => window.location.reload()}>
              Sayfayı Yenile
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FlaskConical className="h-5 w-5" />
          <span>Madde Seçimi</span>
        </CardTitle>
        <CardDescription>
          Hangi madde ile ilgilendiğinizi seçin. Mevcut bir oda varsa katılabilir, yoksa yeni oda açabilirsiniz.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Input */}
        <div className="space-y-2">
          <Label htmlFor="substanceSearch">Madde Ara</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="substanceSearch"
              type="text"
              placeholder="Madde adı, CAS numarası veya EC numarası ile arayın..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Substances List */}
        {substancesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Maddeler yükleniyor...</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredSubstances.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "Arama kriterlerinize uygun madde bulunamadı." : "Henüz madde bulunmuyor."}
              </div>
            ) : (
              filteredSubstances.map((substance) => (
                <div
                  key={substance.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedSubstance?.id === substance.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => handleSubstanceSelect(substance)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{substance.name}</h4>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {substance.cas_number && (
                          <Badge variant="secondary" className="text-xs">
                            CAS: {substance.cas_number}
                          </Badge>
                        )}
                        {substance.ec_number && (
                          <Badge variant="secondary" className="text-xs">
                            EC: {substance.ec_number}
                          </Badge>
                        )}
                      </div>
                      {substance.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {substance.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Selected Substance Actions */}
        {selectedSubstance && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <h4 className="font-medium">Seçilen Madde:</h4>
              <p className="text-sm text-muted-foreground">{selectedSubstance.name}</p>
            </div>

            {!showCreateRoom ? (
              <div className="flex space-x-2">
                <Button 
                  onClick={handleJoinExistingRoom}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Kontrol Ediliyor...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      Mevcut Odaya Katıl
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Bu madde için henüz bir oda bulunmuyor. Yeni oda açmak ister misiniz?
                </p>
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleCreateNewRoom}
                    className="flex-1"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Yeni Oda Aç
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowCreateRoom(false)}
                  >
                    Geri Dön
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Required Selection Notice */}
        {!selectedSubstance && (
          <div className="pt-4 border-t">
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                ⚠️ Madde seçimi zorunludur
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Devam etmek için yukarıdan bir madde seçin
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
