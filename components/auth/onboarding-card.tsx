"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, User, Building, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { completeOnboarding } from "@/app/actions/auth";
import { SubstanceSelectionCard } from "./substance-selection-card";

interface OnboardingCardProps {
  userEmail: string;
}

const countries = [
  { value: "TR", label: "Türkiye" },
  { value: "DE", label: "Almanya" },
  { value: "FR", label: "Fransa" },
  { value: "IT", label: "İtalya" },
  { value: "ES", label: "İspanya" },
  { value: "NL", label: "Hollanda" },
  { value: "BE", label: "Belçika" },
  { value: "PL", label: "Polonya" },
  { value: "US", label: "Amerika Birleşik Devletleri" },
  { value: "GB", label: "Birleşik Krallık" },
  { value: "OTHER", label: "Diğer" },
];

export function OnboardingCard({ userEmail }: OnboardingCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'profile' | 'substance'>('profile');
  const [formData, setFormData] = useState({
    fullName: "",
    companyName: "",
    country: "",
    vatNumber: "",
    address: "",
    contactPhone: "",
    tonnage: "",
  });
  
  const { toast } = useToast();
  const router = useRouter();

  // Load existing profile data
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();          
          if (data.profile) {
            const profile = data.profile;
            // Check if profile is already completed
            if (profile.full_name && profile.company?.name) {
              // Profile is complete, skip to substance selection
              setCurrentStep('substance');
              return;
            }
            
            // Profile is incomplete, load existing data
            setFormData({
              fullName: profile.full_name || "",
              companyName: profile.company?.name || "",
              country: "", // Country is not stored in company table
              vatNumber: profile.company?.vat_number || "",
              address: profile.company?.address || "",
              contactPhone: profile.company?.contact_phone || "",
              tonnage: profile.tonnage?.toString() || "",
            });
          }
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
      }
    };

    loadProfileData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName.trim() || !formData.companyName.trim() || !formData.country) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen tüm zorunlu alanları doldurun.",
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
      const result = await completeOnboarding({
        fullName: formData.fullName.trim(),
        companyName: formData.companyName.trim(),
        country: formData.country,
        vatNumber: formData.vatNumber.trim() || null,
        address: formData.address.trim() || null,
        contactPhone: formData.contactPhone.trim() || null,
        tonnage: formData.tonnage && formData.tonnage.trim() ? 
          (isNaN(parseFloat(formData.tonnage)) ? null : parseFloat(formData.tonnage)) : null,
      });

      if (result.success) {
        toast({
          title: "Profil Tamamlandı!",
          description: "Profil bilgileriniz başarıyla kaydedildi.",
        });
        setCurrentStep('substance');
      } else {
        toast({
          title: "Hata",
          description: result.error || "Bir hata oluştu. Lütfen tekrar deneyin.",
          variant: "destructive",
        });
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

  const handleSubstanceComplete = () => {
    // Redirect to dashboard after substance selection is completed
    router.push("/");
  };

  // Show substance selection step
  if (currentStep === 'substance') {
    return <SubstanceSelectionCard userEmail={userEmail} onComplete={handleSubstanceComplete} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>Profil Bilgileri</span>
        </CardTitle>
        <CardDescription>
          MBDF-IT Portal'ı kullanmaya başlamak için lütfen bilgilerinizi girin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Kişisel Bilgiler</span>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">E-posta Adresi</Label>
              <Input
                id="email"
                type="email"
                value={userEmail}
                disabled
                className="bg-muted"
              />
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
          </div>

          {/* Company Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
              <Building className="h-4 w-4" />
              <span>Şirket Bilgileri</span>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="companyName">
                Şirket Adı <span className="text-destructive">*</span>
              </Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Şirket Adı A.Ş."
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">
                  Ülke <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
                  disabled={isLoading}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ülke seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.value} value={country.value}>
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4" />
                          <span>{country.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
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
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Adres</Label>
              <Input
                id="address"
                type="text"
                placeholder="Şirket adresi"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
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
            </div>
          </div>
          
          <div className="pt-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                "Profili Tamamla"
              )}
            </Button>
          </div>
        </form>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            <span className="text-destructive">*</span> işaretli alanlar zorunludur
          </p>
        </div>
      </CardContent>
    </Card>
  );
}