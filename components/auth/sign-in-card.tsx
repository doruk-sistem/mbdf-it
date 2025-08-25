"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendMagicLink, signInWithPassword } from "@/app/actions/auth";

export function SignInCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoadingMagic, setIsLoadingMagic] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Hata", description: "Lütfen e-posta adresinizi girin.", variant: "destructive" });
      return;
    }
    setIsLoadingMagic(true);
    try {
      const result = await sendMagicLink(email);
      if (result.success) {
        setIsEmailSent(true);
        toast({ title: "Başarılı!", description: "Giriş bağlantısı e-postanıza gönderildi." });
      } else {
        toast({ title: "Hata", description: result.error || "Bir hata oluştu.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Hata", description: "Bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsLoadingMagic(false);
    }
  };

  const handleSignInWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: "Hata", description: "E-posta ve şifre gereklidir.", variant: "destructive" });
      return;
    }
    setIsLoadingPassword(true);
    try {
      const result = await signInWithPassword({ email, password });
      if (result.success) {
        toast({ title: "Hoş geldiniz", description: "Giriş başarılı." });
        window.location.href = result.needsOnboarding ? "/onboarding" : "/";
      } else {
        toast({ title: "Giriş başarısız", description: result.error || "Bir hata oluştu.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Hata", description: "Bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsLoadingPassword(false);
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
            onClick={() => { setIsEmailSent(false); setEmail(""); }}
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
        <CardDescription>Magic Link veya e-posta ve şifre ile giriş yapın.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="magic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="magic">Magic Link</TabsTrigger>
            <TabsTrigger value="password">E-posta & Şifre</TabsTrigger>
          </TabsList>

          <TabsContent value="magic" className="space-y-4">
            <form onSubmit={handleSendMagicLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-magic">E-posta Adresi</Label>
                <Input
                  id="email-magic"
                  type="email"
                  placeholder="ornek@sirket.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoadingMagic}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoadingMagic} aria-label="Magic link gönder">
                {isLoadingMagic ? (
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
          </TabsContent>

          <TabsContent value="password" className="space-y-4">
            <form onSubmit={handleSignInWithPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-pass">E-posta</Label>
                <Input
                  id="email-pass"
                  type="email"
                  placeholder="ornek@sirket.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoadingPassword}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoadingPassword}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoadingPassword} aria-label="Şifre ile giriş yap">
                {isLoadingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Giriş yapılıyor...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Giriş Yap
                  </>
                )}
              </Button>
            </form>
            <div className="flex items-center justify-between text-sm">
              <Link href="/auth/forgot-password" className="text-primary underline">Şifremi unuttum</Link>
              <Link href="/auth/sign-up" className="text-primary underline">Hesabın yok mu? Kayıt ol</Link>
            </div>
          </TabsContent>
        </Tabs>
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Giriş yaparak <a href="#" className="underline hover:text-primary">Kullanım Koşulları</a> ve <a href="#" className="underline hover:text-primary">Gizlilik Politikası</a>'nı kabul etmiş olursunuz.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}