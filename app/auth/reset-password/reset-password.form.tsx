"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
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
    const result = await updatePassword(password);
    setIsLoading(false);
    if (result?.success === false) {
      toast({ title: "Hata", description: result.error || "Bir hata oluştu.", variant: "destructive" });
      return;
    }
    // Success! Show message and redirect
    // The cookie will be automatically deleted by the server action
    toast({ title: "Başarılı", description: "Şifreniz başarıyla güncellendi." });
    setTimeout(() => router.push('/'), 1500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yeni Şifre</CardTitle>
        <CardDescription>Şifrenizi belirleyin.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Yeni Şifre</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Yeni Şifre (Tekrar)</Label>
            <Input id="confirm" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading} aria-label="Şifreyi güncelle">
            {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Güncelleniyor...</>) : 'Şifreyi Güncelle'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}


