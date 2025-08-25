"use client";

import Link from "next/link";
import { useState } from "react";
import { signUpWithPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      toast({ title: "Hata", description: "Tüm alanlar zorunludur.", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Hata", description: "Şifre en az 8 karakter olmalı.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Hata", description: "Şifreler eşleşmiyor.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const result = await signUpWithPassword({ email, password });
    setIsLoading(false);
    if (result.success) {
      toast({ title: "Kayıt başarılı", description: "Gerekirse e-posta doğrulaması gönderildi." });
      window.location.href = "/auth/sign-in";
    } else {
      toast({ title: "Kayıt başarısız", description: result.error || "Bir hata oluştu.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Hesap Oluştur</h1>
          <p className="text-muted-foreground mt-2">E-posta ve şifre ile kayıt olun</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Kayıt Ol</CardTitle>
            <CardDescription>E-posta ve şifre ile hesap oluşturun.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input id="email" type="email" placeholder="ornek@sirket.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Şifre (Tekrar)</Label>
                <Input id="confirm" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading} aria-label="Kayıt ol">
                {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gönderiliyor...</>) : 'Kayıt Ol'}
              </Button>
            </form>
            <div className="mt-4 text-sm text-center">
              <Link href="/auth/sign-in" className="text-primary underline">Hesabın var mı? Giriş yap</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


