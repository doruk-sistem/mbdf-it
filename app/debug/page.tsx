"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DebugPage() {
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [envInfo, setEnvInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkEnvironment = async () => {
      
      // Environment variables check
      const env = {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
          `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : 
          null,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      };

      // User check
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        setSessionInfo({ user, error });
      } catch (err) {
        setSessionInfo({ error: err });
      }

      setEnvInfo(env);
      setLoading(false);
    };

    checkEnvironment();
  }, []);

  const testMagicLink = async () => {
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: "test@example.com",
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
      });

      if (error) {
        alert(`Magic link hatası: ${error.message}`);
      } else {
        alert("Magic link test başarılı! (test email'e gönderilmedi)");
      }
    } catch (err: any) {
      alert(`Beklenmeyen hata: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="container mx-auto py-6">Yükleniyor...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">Authentication Debug</h1>
      
      {/* Environment Variables */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>Ortam değişkenlerinin durumu</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {envInfo?.supabaseUrl || "❌ Tanımlı değil"}
            </div>
            <div>
              <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong> {envInfo?.hasAnonKey ? `✅ ${envInfo.anonKey}` : "❌ Tanımlı değil"}
            </div>
            <div>
              <strong>NEXT_PUBLIC_SITE_URL:</strong> {envInfo?.siteUrl || "❌ Tanımlı değil"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Info */}
      <Card>
        <CardHeader>
          <CardTitle>Session Durumu</CardTitle>
          <CardDescription>Mevcut authentication durumu</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sessionInfo?.error ? (
              <div className="text-red-600">
                <strong>Hata:</strong> {sessionInfo.error.message}
              </div>
            ) : sessionInfo?.user ? (
              <div className="text-green-600">
                <strong>✅ Kullanıcı giriş yapmış:</strong> {sessionInfo.user.email}
              </div>
            ) : (
              <div className="text-gray-600">
                <strong>❌ Kullanıcı giriş yapmamış</strong>
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <Button onClick={testMagicLink}>
              Magic Link Test Et
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Raw Session Data */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Session Data</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-xs overflow-auto">
            {JSON.stringify(sessionInfo, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}