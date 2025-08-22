import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/clientSupabase";
import { SignInCard } from "@/components/auth/sign-in-card";
import { Skeleton } from "@/components/ui/skeleton";

export default async function SignInPage() {
  // Check if user is already authenticated
  const supabase = createServerSupabase();
  
  const { data: { user: authUser }, error } = await supabase.auth.getUser();

  console.log("authUser", authUser);
  console.log("aaa");
  
  if (authUser && !error) {
    redirect("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">MBDF-IT Portal</h1>
          <p className="text-muted-foreground mt-2">
            KKDİK MBDF süreçleri yönetim platformu
          </p>
        </div>
        
        <Suspense fallback={<SignInCardSkeleton />}>
          <SignInCard />
        </Suspense>
        
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Hesabınıza giriş yapmak için e-posta adresinizi girin.
            <br />
            Size güvenli bir giriş bağlantısı göndereceğiz.
          </p>
        </div>
      </div>
    </div>
  );
}

function SignInCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border shadow-sm p-6 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}