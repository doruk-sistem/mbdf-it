"use client";

import { useState } from "react";
import { LogOut, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { signOut } from "@/app/actions/auth";

interface SecuritySectionProps {
  userEmail: string;
}

export function SecuritySection({ userEmail }: SecuritySectionProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { toast } = useToast();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    
    try {
      await signOut();
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Çıkış yapılırken bir hata oluştu.",
        variant: "destructive",
      });
      setIsSigningOut(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Information */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Hesap Bilgileri</h3>
          <p className="text-sm text-muted-foreground">
            Hesabınızla ilgili temel bilgiler
          </p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">E-posta Adresi</p>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Authentication Method */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Kimlik Doğrulama</h3>
          <p className="text-sm text-muted-foreground">
            Hesabınıza nasıl giriş yapacağınızı yönetin
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Magic Link Kimlik Doğrulama</CardTitle>
            <CardDescription>
              Hesabınız magic link ile korunmaktadır. Her giriş için e-postanıza gönderilen özel bağlantıyı kullanın.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">✓ Aktif</p>
                <p className="text-xs text-muted-foreground">
                  Güvenli ve şifresiz giriş
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sign Out */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Oturum Yönetimi</h3>
          <p className="text-sm text-muted-foreground">
            Hesabınızdan çıkış yapın
          </p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Tüm Cihazlardan Çıkış</p>
                <p className="text-xs text-muted-foreground">
                  Bu işlem tüm cihazlardaki oturumlarınızı sonlandırır
                </p>
              </div>
              <Button 
                variant="destructive" 
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Çıkış yapılıyor...
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    Çıkış Yap
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}