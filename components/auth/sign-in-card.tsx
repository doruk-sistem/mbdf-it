"use client";

import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { sendMagicLink } from "@/app/actions/auth";

export function SignInCard() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Hata",
        description: "Lütfen e-posta adresinizi girin.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await sendMagicLink(email);
      
      if (result.success) {
        setIsEmailSent(true);
        toast({
          title: "Başarılı!",
          description: "Giriş bağlantısı e-postanıza gönderildi.",
        });
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

  if (isEmailSent) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto bg-green-100 dark:bg-green-900 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle>E-postanızı kontrol edin</CardTitle>
          <CardDescription>
            <span className="font-medium">{email}</span> adresine giriş bağlantısı gönderdik.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Bağlantıyı göremiyorsanız:</strong>
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>• Spam/junk klasörünüzü kontrol edin</li>
              <li>• E-posta adresinizin doğru olduğundan emin olun</li>
              <li>• Birkaç dakika bekleyip tekrar kontrol edin</li>
            </ul>
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => {
              setIsEmailSent(false);
              setEmail("");
            }}
            className="w-full"
          >
            Farklı e-posta ile dene
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Giriş Yap</CardTitle>
        <CardDescription>
          E-posta adresinizi girin, size güvenli bir giriş bağlantısı gönderelim.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-posta Adresi</Label>
            <Input
              id="email"
              type="email"
              placeholder="ornek@sirket.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gönderiliyor...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Giriş Bağlantısı Gönder
              </>
            )}
          </Button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Giriş yaparak{" "}
            <a href="#" className="underline hover:text-primary">
              Kullanım Koşulları
            </a>{" "}
            ve{" "}
            <a href="#" className="underline hover:text-primary">
              Gizlilik Politikası
            </a>
            'nı kabul etmiş olursunuz.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}