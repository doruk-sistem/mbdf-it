import { createServerSupabase } from "@/lib/clientSupabase";
import { Navigation } from "@/components/navigation";

export async function NavigationWrapper() {
  const supabase = createServerSupabase();
  
  // Get current user (more secure than getSession)
  const { data: { user: authUser }, error } = await supabase.auth.getUser();
  
  let user = null;
  
  if (authUser && !error) {
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
      .eq("id", authUser.id)
      .single();

    if (profile) {
      user = {
        email: profile.email,
        full_name: profile.full_name || null,
        avatar_url: profile.avatar_url || null,
        company: profile.company || null,
      };
    }
  }
  
  return <Navigation user={user || undefined} />;
}