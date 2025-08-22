"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { updateCompanyInfo } from "@/app/actions/auth";

interface CompanyFormProps {
  initialData: {
    name: string;
    vatNumber: string;
    address: string;
    contactEmail: string;
    contactPhone: string;
  };
}

export function CompanyForm({ initialData }: CompanyFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData.name,
    vatNumber: initialData.vatNumber,
    address: initialData.address,
    contactEmail: initialData.contactEmail,
    contactPhone: initialData.contactPhone,
  });
  
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Eksik Bilgi",
        description: "Şirket adı alanı zorunludur.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name.trim());
      formDataToSend.append("vatNumber", formData.vatNumber.trim());
      formDataToSend.append("address", formData.address.trim());
      formDataToSend.append("contactEmail", formData.contactEmail.trim());
      formDataToSend.append("contactPhone", formData.contactPhone.trim());
      
      await updateCompanyInfo(formDataToSend);
      
      toast({
        title: "Başarılı!",
        description: "Şirket bilgileri başarıyla güncellendi.",
      });
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Şirket bilgileri güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          Şirket Adı <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          type="text"
          placeholder="Şirket Adı A.Ş."
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          disabled={isLoading}
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vatNumber">Vergi Numarası</Label>
          <Input
            id="vatNumber"
            type="text"
            placeholder="1234567890"
            value={formData.vatNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, vatNumber: e.target.value }))}
            disabled={isLoading}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="contactPhone">İletişim Telefonu</Label>
          <Input
            id="contactPhone"
            type="tel"
            placeholder="+90 555 123 4567"
            value={formData.contactPhone}
            onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
            disabled={isLoading}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="address">Adres</Label>
        <Textarea
          id="address"
          placeholder="Şirket adresi..."
          value={formData.address}
          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
          disabled={isLoading}
          rows={3}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="contactEmail">İletişim E-postası</Label>
        <Input
          id="contactEmail"
          type="email"
          placeholder="info@company.com"
          value={formData.contactEmail}
          onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
          disabled={isLoading}
        />
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