"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Search,
  FlaskConical,
  Plus,
  Users,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useSubstances } from "@/hooks/use-substances";
import { Substance } from "@/lib/schemas";

interface SubstanceSelectionCardProps {
  userEmail: string;
  onComplete: () => void;
}

interface SelectedSubstanceWithTonnage {
  substance: Substance;
  tonnageRange: string;
}

const tonnageRanges = [
  { value: "1-10", label: "1-10 ton" },
  { value: "10-100", label: "10-100 ton" },
  { value: "100-1000", label: "100-1000 ton" },
  { value: "1000+", label: "1000+ ton" },
];

export function SubstanceSelectionCard({
  userEmail,
  onComplete,
}: SubstanceSelectionCardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubstances, setSelectedSubstances] = useState<
    SelectedSubstanceWithTonnage[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [substancesWithoutRooms, setSubstancesWithoutRooms] = useState<
    SelectedSubstanceWithTonnage[]
  >([]);
  const [showCreateRoomDialog, setShowCreateRoomDialog] = useState(false);
  const [roomDetails, setRoomDetails] = useState<{
    [key: string]: { name: string };
  }>({});

  const {
    data: substancesData,
    isLoading: substancesLoading,
    error,
  } = useSubstances();
  const { toast } = useToast();
  const router = useRouter();

  // Filter substances based on search term
  const filteredSubstances =
    substancesData?.items?.filter((substance) => {
      if (!searchTerm) return true;

      const searchLower = searchTerm.toLowerCase();
      return (
        substance.name.toLowerCase().includes(searchLower) ||
        substance.cas_number?.toLowerCase().includes(searchLower) ||
        substance.ec_number?.toLowerCase().includes(searchLower)
      );
    }) || [];

  const handleSubstanceSelect = (substance: Substance) => {
    // Check if substance is already selected
    const isAlreadySelected = selectedSubstances.some(
      (item) => item.substance.id === substance.id
    );

    if (!isAlreadySelected) {
      // Replace the entire array with just this substance (single selection)
      setSelectedSubstances([{ substance, tonnageRange: "1-10" }]);
    }
  };

  const handleTonnageChange = (substanceId: string, tonnageRange: string) => {
    setSelectedSubstances((prev) =>
      prev.map((item) =>
        item.substance.id === substanceId ? { ...item, tonnageRange } : item
      )
    );
  };

  const handleRemoveSubstance = (substanceId: string) => {
    setSelectedSubstances((prev) =>
      prev.filter((item) => item.substance.id !== substanceId)
    );
  };

  const handleJoinRooms = async () => {
    if (selectedSubstances.length === 0) return;

    const item = selectedSubstances[0]; // Since we only allow one substance selection
    setIsLoading(true);
    
    try {
      // Check if room exists for this substance
      const response = await fetch(
        `/api/rooms?substance_id=${item.substance.id}`
      );
      const data = await response.json();

      if (data.success && data.items && data.items.length > 0) {
        // Room exists, join it
        const room = data.items[0]; // Take the first active room
        const joinPayload = {
          roomId: room.id,
          userEmail: userEmail,
          role: "member",
          tonnageRange: item.tonnageRange,
        };

        const joinResponse = await fetch("/api/members", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(joinPayload),
        });

        const joinData = await joinResponse.json();
        
        if (joinData.success) {
          toast({
            title: "Başarılı!",
            description: `Odaya başarıyla katıldınız.`,
          });
          onComplete();
        } else {
          toast({
            title: "Odaya katılamadınız",
            description: joinData.error || "Bir hata oluştu.",
            variant: "destructive",
          });
        }
      } else {
        // No room exists for this substance
        setSubstancesWithoutRooms([item]);

        // Initialize room details with default values
        const initialRoomDetails: {
          [key: string]: { name: string };
        } = {};
        const casNumber = item.substance.cas_number ? `CAS: ${item.substance.cas_number}` : '';
        const ecNumber = item.substance.ec_number ? `EC: ${item.substance.ec_number}` : '';
        const identifiers = [casNumber, ecNumber].filter(Boolean).join(', ');
        
        initialRoomDetails[item.substance.id || ""] = {
          name: `${item.substance.name}${identifiers ? ` (${identifiers})` : ''}`,
        };
        setRoomDetails(initialRoomDetails);
        setShowCreateRoomDialog(true);
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

  const handleCreateRoomsForSubstances = async () => {
    if (substancesWithoutRooms.length === 0) return;

    const item = substancesWithoutRooms[0]; // Since we only allow one substance selection
    
    const details = roomDetails[item.substance.id || ""];

    setIsLoading(true);
    try {
      // Create room for the substance
      const roomPayload = {
        substance_id: item.substance.id,
        name: details.name,
        description: "",
        tonnage_range: item.tonnageRange,
      };
      
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(roomPayload),
      });

      const data = await response.json();
      if (!response.ok || !data.id) {
        toast({
          title: "Hata",
          description: data.error || "Oda oluşturulurken bir hata oluştu.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Başarılı!",
        description: `Oda oluşturuldu ve katıldınız.`,
      });

      setShowCreateRoomDialog(false);
      onComplete();
    } catch (error) {
      toast({
        title: "Hata",
        description: "Oda oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipRoomCreation = () => {
    setShowCreateRoomDialog(false);
    onComplete();
  };

  const handleRoomDetailChange = (
    substanceId: string,
    field: "name",
    value: string
  ) => {
    setRoomDetails((prev) => ({
      ...prev,
      [substanceId]: {
        ...prev[substanceId],
        [field]: value,
      },
    }));
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
          Hangi madde ile ilgilendiğinizi seçin. Mevcut bir oda varsa
          katılabilir, yoksa yeni oda açabilirsiniz. (Sadece 1 madde seçebilirsiniz)
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
                {searchTerm
                  ? "Arama kriterlerinize uygun madde bulunamadı."
                  : "Henüz madde bulunmuyor."}
              </div>
            ) : (
              filteredSubstances.map((substance) => {
                const isSelected = selectedSubstances.some(
                  (item) => item.substance.id === substance.id
                );
                return (
                  <div
                    key={substance.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => handleSubstanceSelect(substance)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{substance.name}</h4>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
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
                );
              })
            )}
          </div>
        )}

        {/* Selected Substances with Tonnage Selection */}
        {selectedSubstances.length > 0 && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <h4 className="font-medium">
                Seçilen Madde:
              </h4>
              <p className="text-sm text-muted-foreground">
                Tonnage aralığını seçin ve odaya katılın.
              </p>
            </div>

            <div className="space-y-3">
              {selectedSubstances.map((item) => (
                <div
                  key={item.substance.id}
                  className="p-3 border rounded-lg bg-background"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h5 className="font-medium">{item.substance.name}</h5>
                      <div className="flex gap-2 mt-1">
                        {item.substance.cas_number && (
                          <Badge variant="outline" className="text-xs">
                            CAS: {item.substance.cas_number}
                          </Badge>
                        )}
                        {item.substance.ec_number && (
                          <Badge variant="outline" className="text-xs">
                            EC: {item.substance.ec_number}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleRemoveSubstance(item.substance.id || "")
                      }
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor={`tonnage-${item.substance.id}`}
                      className="text-sm"
                    >
                      Tonnage Aralığı
                    </Label>
                    <Select
                      value={item.tonnageRange}
                      onValueChange={(value) =>
                        handleTonnageChange(item.substance.id || "", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tonnage aralığı seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {tonnageRanges.map((range) => (
                          <SelectItem key={range.value} value={range.value}>
                            {range.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={handleJoinRooms}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Odaya Katılıyor...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Odaya Katıl
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Required Selection Notice */}
        {selectedSubstances.length === 0 && (
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

      {/* Room Creation Dialog */}
      <Dialog
        open={showCreateRoomDialog}
        onOpenChange={setShowCreateRoomDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Oda Oluştur</DialogTitle>
            <DialogDescription>
              Bu madde için mevcut oda bulunamadı. Yeni oda oluşturmak ister misiniz?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            <h4 className="font-medium">Oda Oluşturulacak Madde:</h4>
            {substancesWithoutRooms.map((item) => {
              const details = roomDetails[item.substance.id || ""] || {
                name: "",
              };
              return (
                <div
                  key={item.substance.id}
                  className="p-4 border rounded-lg bg-muted/50 space-y-3"
                >
                  <div>
                    <h5 className="font-medium text-sm">
                      {item.substance.name}
                    </h5>
                    <p className="text-xs text-muted-foreground">
                      Tonnage:{" "}
                      {
                        tonnageRanges.find((r) => r.value === item.tonnageRange)
                          ?.label
                      }
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor={`room-name-${item.substance.id}`}
                      className="text-sm"
                    >
                      Oda Adı
                    </Label>
                    <Input
                      id={`room-name-${item.substance.id}`}
                      value={details.name}
                      readOnly
                      className="text-sm bg-muted"
                    />
                  </div>

                </div>
              );
            })}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleSkipRoomCreation}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Şimdi Değil
            </Button>
            <Button
              onClick={handleCreateRoomsForSubstances}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Odayı Oluştur
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
