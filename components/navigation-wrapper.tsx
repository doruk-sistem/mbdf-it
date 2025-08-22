import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";

export async function NavigationWrapper() {
  const cookieStore = cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  
  // Get current session
  const { data: { session } } = await supabase.auth.getSession();
  
  let user = null;
  
  if (session?.user) {
    // Get user profile with company info
    const { data: profile } = await supabase
      .from("profiles")
      .select(`
        *,
        company:company_id (
          id,
          name
        )
      `)
      .eq("id", session.user.id)
      .single();
    
    if (profile) {
      user = {
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        company: profile.company,
      };
    }
  }
  
  return <Navigation user={user} />;
}