"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Building2, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubstances } from "@/hooks/use-substances";
import { useCreateRoom } from "@/hooks/use-rooms";
import { TONNAGE_RANGES } from "@/lib/tonnage";

interface CreateRoomFormProps {
  preselectedSubstanceId?: string;
}

export function CreateRoomForm({ preselectedSubstanceId }: CreateRoomFormProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    substanceId: preselectedSubstanceId || "",
    tonnageRange: "",
  });
  
  const router = useRouter();
  
  // Query hooks
  const { data: substancesData, isLoading: substancesLoading } = useSubstances();
  const createRoomMutation = useCreateRoom();

  // Extract substances from query response
  const substances = substancesData?.items || [];

  const filteredSubstances = substances.filter(substance =>
    substance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (substance.cas_number && substance.cas_number.includes(searchTerm)) ||
    (substance.ec_number && substance.ec_number.includes(searchTerm))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.substanceId || !formData.tonnageRange) {
      return;
    }

    const roomName = generateRoomName(selectedSubstance);

    createRoomMutation.mutate(
      {
        name: roomName,
        description: "",
        substance_id: formData.substanceId,
        tonnage_range: formData.tonnageRange,
      },
      {
        onSuccess: () => {
          router.push('/');
        }
      }
    );
  };

  const selectedSubstance = substances.find(s => s.id === formData.substanceId);

  // Auto-generate room name from selected substance
  const generateRoomName = (substance: any) => {
    if (!substance) return "";
    
    const casNumber = substance.cas_number ? `CAS: ${substance.cas_number}` : '';
    const ecNumber = substance.ec_number ? `EC: ${substance.ec_number}` : '';
    const identifiers = [casNumber, ecNumber].filter(Boolean).join(', ');
    
    return `${substance.name}${identifiers ? ` (${identifiers})` : ''}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="h-5 w-5" />
          <span>MBDF Odası Bilgileri</span>
        </CardTitle>
        <CardDescription>
          Yeni MBDF odası oluşturmak için gerekli bilgileri girin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Substance Selection */}
          <div className="space-y-2">
            <Label htmlFor="substance">
              Madde Seçimi <span className="text-destructive">*</span>
            </Label>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Madde adı veya CAS numarası ile ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  disabled={createRoomMutation.isPending}
                />
              </div>
              <Select
                value={formData.substanceId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, substanceId: value }))}
                disabled={createRoomMutation.isPending}
                required
              >
                <SelectTrigger className="min-h-[4rem] items-start justify-start">
                  {selectedSubstance ? (
                    <div className="flex flex-col items-start text-left w-full">
                      <span className="font-medium">{selectedSubstance.name}</span>
                      <div className="text-xs text-muted-foreground flex gap-3 mt-0.5">
                        {selectedSubstance.ec_number && <span>EC: {selectedSubstance.ec_number}</span>}
                        {selectedSubstance.cas_number && <span>CAS: {selectedSubstance.cas_number}</span>}
                      </div>
                    </div>
                  ) : (
                    <SelectValue placeholder="Madde seçin" />
                  )}
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {substancesLoading ? (
                    <div className="px-2 py-1 text-sm text-muted-foreground">
                      Maddeler yükleniyor...
                    </div>
                  ) : filteredSubstances.length > 0 ? (
                    filteredSubstances.map((substance) => (
                      <SelectItem key={substance.id} value={substance.id || ''}>
                        <div className="flex flex-col">
                          <span className="font-medium">{substance.name}</span>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {substance.ec_number && <div>EC: {substance.ec_number}</div>}
                            {substance.cas_number && <div>CAS: {substance.cas_number}</div>}
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1 text-sm text-muted-foreground">
                      {searchTerm ? "Arama sonucu bulunamadı" : "Madde bulunamadı"}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            {selectedSubstance && (
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <div className="text-sm space-y-1">
                  <div><span className="font-medium">Seçili Madde:</span> {selectedSubstance.name}</div>
                  <div><span className="font-medium">Oda Adı:</span> <span className="text-blue-600 dark:text-blue-400">{generateRoomName(selectedSubstance)}</span></div>
                  {selectedSubstance.ec_number && (
                    <div><span className="font-medium">EC No:</span> {selectedSubstance.ec_number}</div>
                  )}
                  {selectedSubstance.cas_number && (
                    <div><span className="font-medium">CAS No:</span> {selectedSubstance.cas_number}</div>
                  )}
                  {selectedSubstance.description && (
                    <div className="text-muted-foreground">{selectedSubstance.description}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tonnage Selection */}
          <div className="space-y-2">
            <Label htmlFor="tonnage">
              Tonaj Aralığı <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.tonnageRange}
              onValueChange={(value) => setFormData(prev => ({ ...prev, tonnageRange: value }))}
              disabled={createRoomMutation.isPending}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Oda oluşturmak için tonaj aralığını seçin" />
              </SelectTrigger>
              <SelectContent>
                {TONNAGE_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          {/* Actions */}
          <div className="flex space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={createRoomMutation.isPending}
              className="flex-1"
            >
              İptal
            </Button>
            <Button type="submit" disabled={createRoomMutation.isPending || !formData.substanceId || !formData.tonnageRange} className="flex-1">
              {createRoomMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-4 w-4" />
                  Oda Oluştur
                </>
              )}
            </Button>
          </div>
        </form>
        
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            MBDF Odası Hakkında
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            MBDF (Madde Bilgi Değişim Formatı) odası, belirli bir madde için KKDİK süreçlerini 
            yönetmek amacıyla oluşturulan çalışma alanıdır. Bu odada madde için gerekli 
            dokümantasyon, Lead Registrant seçimi ve veri paylaşımı işlemlerini gerçekleştirebilirsiniz.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}