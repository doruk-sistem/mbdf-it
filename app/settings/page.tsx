import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/clientSupabase";
import { ProfileForm } from "@/components/settings/profile-form";
import { CompanyForm } from "@/components/settings/company-form";
import { SecuritySection } from "@/components/settings/security-section";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Building, Shield } from "lucide-react";

export default async function SettingsPage() {
  const supabase = createServerSupabase();
  
  // Check authentication
  const { data: { user: authUser }, error } = await supabase.auth.getUser();
  
  if (!authUser || error) {
    redirect("/auth/sign-in");
  }

  // Get user profile with company info
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      *,
      company:company_id (
        id,
        name,
        vat_number,
        address,
        contact_email,
        contact_phone
      )
    `)
    .eq("id", authUser.id)
    .single();

  if (!profile?.full_name || !profile?.company_id) {
    redirect("/onboarding");
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ayarlar</h1>
        <p className="text-muted-foreground mt-2">
          Profil bilgilerinizi ve hesap ayarlarınızı yönetin
        </p>
      </div>

      <Separator />

      <div className="grid gap-8">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profil Bilgileri</span>
            </CardTitle>
            <CardDescription>
              Kişisel bilgilerinizi güncelleyin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              initialData={{
                email: profile.email,
                fullName: profile.full_name || "",
                phone: profile.phone || "",
              }}
            />
          </CardContent>
        </Card>

        {/* Company Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>Şirket Bilgileri</span>
            </CardTitle>
            <CardDescription>
              Şirket bilgilerinizi güncelleyin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CompanyForm
              initialData={{
                name: profile.company?.name || "",
                vatNumber: profile.company?.vat_number || "",
                address: profile.company?.address || "",
                contactEmail: profile.company?.contact_email || "",
                contactPhone: profile.company?.contact_phone || "",
              }}
            />
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Güvenlik</span>
            </CardTitle>
            <CardDescription>
              Hesap güvenliği ve oturum yönetimi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SecuritySection userEmail={profile.email} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}