"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { updateUserProfile } from "@/app/actions/auth";

interface ProfileFormProps {
  initialData: {
    email: string;
    fullName: string;
    phone: string;
    tonnage: number | null;
  };
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: initialData.fullName,
    phone: initialData.phone,
    tonnage: initialData.tonnage?.toString() || "",
  });
  
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName.trim()) {
      toast({
        title: "Eksik Bilgi",
        description: "Ad Soyad alanı zorunludur.",
        variant: "destructive",
      });
      return;
    }

    // Validate tonnage if provided
    if (formData.tonnage && formData.tonnage.trim()) {
      const tonnageValue = parseFloat(formData.tonnage);
      if (isNaN(tonnageValue) || tonnageValue < 1 || tonnageValue > 1000) {
        toast({
          title: "Geçersiz Tonaj",
          description: "Tonaj 1-1000 ton arası olmalıdır.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("fullName", formData.fullName.trim());
      formDataToSend.append("phone", formData.phone.trim());
      formDataToSend.append("tonnage", formData.tonnage && formData.tonnage.trim() ? 
        (isNaN(parseFloat(formData.tonnage)) ? "" : parseFloat(formData.tonnage).toString()) : "");
      
      await updateUserProfile(formDataToSend);
      
      toast({
        title: "Başarılı!",
        description: "Profil bilgileriniz başarıyla güncellendi.",
      });
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Profil güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-posta Adresi</Label>
        <Input
          id="email"
          type="email"
          value={initialData.email}
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          E-posta adresiniz değiştirilemez
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="fullName">
          Ad Soyad <span className="text-destructive">*</span>
        </Label>
        <Input
          id="fullName"
          type="text"
          placeholder="Adınız Soyadınız"
          value={formData.fullName}
          onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
          disabled={isLoading}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone">Telefon Numarası</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+90 555 123 4567"
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          disabled={isLoading}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="tonnage">Tonaj (Ton)</Label>
        <Input
          id="tonnage"
          type="number"
          step="0.1"
          min="1"
          max="1000"
          placeholder="Örn: 1.5"
          value={formData.tonnage}
          onChange={(e) => setFormData(prev => ({ ...prev, tonnage: e.target.value }))}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          Tonaj bilginizi güncelleyebilirsiniz (1-1000 ton arası)
        </p>
      </div>
      
      <div className="pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Güncelleniyor...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Kaydet
            </>
          )}
        </Button>
      </div>
    </form>
  );
}