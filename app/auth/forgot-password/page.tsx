"use client";

import Link from "next/link";
import { useState } from "react";
import { sendPasswordReset } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Hata", description: "E-posta gereklidir.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const result = await sendPasswordReset(email);
    setIsLoading(false);
    if (result.success) {
      toast({ title: "E-posta gönderildi", description: "Sıfırlama bağlantısı e-postanıza gönderildi." });
      window.location.href = "/auth/sign-in";
    } else {
      toast({ title: "Hata", description: result.error || "Bir hata oluştu.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Şifremi Unuttum</h1>
          <p className="text-muted-foreground mt-2">E-posta adresinizi girin, size bir sıfırlama bağlantısı gönderelim.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Şifre Sıfırlama</CardTitle>
            <CardDescription>E-posta adresinize bir bağlantı göndereceğiz.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input id="email" type="email" placeholder="ornek@sirket.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading} aria-label="Sıfırlama e-postası gönder">
                {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gönderiliyor...</>) : 'E-posta Gönder'}
              </Button>
            </form>
            <div className="mt-4 text-sm text-center">
              <Link href="/auth/sign-in" className="text-primary underline">Giriş sayfasına dön</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


