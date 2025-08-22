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
import { useToast } from "@/components/ui/use-toast";
import { createRoom } from "@/app/actions/rooms";

// Mock substance data - bu gerçek uygulamada API'den gelecek
const substances = [
  { id: "1", name: "Titanium Dioxide", casNumber: "13463-67-7" },
  { id: "2", name: "Silicon Dioxide", casNumber: "7631-86-9" },
  { id: "3", name: "Iron Oxide", casNumber: "1309-37-1" },
  { id: "4", name: "Aluminum Oxide", casNumber: "1344-28-1" },
  { id: "5", name: "Zinc Oxide", casNumber: "1314-13-2" },
  { id: "6", name: "Calcium Carbonate", casNumber: "471-34-1" },
  { id: "7", name: "Sodium Chloride", casNumber: "7647-14-5" },
  { id: "8", name: "Potassium Chloride", casNumber: "7447-40-7" },
  { id: "9", name: "Magnesium Sulfate", casNumber: "7487-88-9" },
  { id: "10", name: "Copper Sulfate", casNumber: "7758-98-7" },
];

export function CreateRoomForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    substanceId: "",
  });
  
  const { toast } = useToast();
  const router = useRouter();

  const filteredSubstances = substances.filter(substance =>
    substance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    substance.casNumber.includes(searchTerm)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.substanceId) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen oda adı ve madde seçimini yapın.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const formDataObj = new FormData();
      formDataObj.append("name", formData.name.trim());
      formDataObj.append("description", formData.description.trim());
      formDataObj.append("substanceId", formData.substanceId);

      await createRoom(formDataObj);
      
      toast({
        title: "Başarılı!",
        description: "MBDF odası başarıyla oluşturuldu.",
      });
      
      // createRoom function already redirects, so we don't need to do it here
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Oda oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedSubstance = substances.find(s => s.id === formData.substanceId);

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
          {/* Room Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Oda Adı <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="örn. TiO2 MBDF Çalışma Grubu"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={isLoading}
              required
            />
          </div>

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
                  disabled={isLoading}
                />
              </div>
              <Select
                value={formData.substanceId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, substanceId: value }))}
                disabled={isLoading}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Madde seçin" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {filteredSubstances.length > 0 ? (
                    filteredSubstances.map((substance) => (
                      <SelectItem key={substance.id} value={substance.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{substance.name}</span>
                          <span className="text-sm text-muted-foreground">CAS: {substance.casNumber}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1 text-sm text-muted-foreground">
                      Madde bulunamadı
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            {selectedSubstance && (
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <div className="text-sm">
                  <span className="font-medium">Seçili Madde:</span> {selectedSubstance.name}
                  <br />
                  <span className="font-medium">CAS No:</span> {selectedSubstance.casNumber}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              placeholder="MBDF odası hakkında açıklama (opsiyonel)"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={isLoading}
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
              className="flex-1"
            >
              İptal
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
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