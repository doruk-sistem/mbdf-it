"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClientSupabaseClient } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: User | null;
  initialProfile?: any | null;
}

export function AuthProvider({ children, initialUser, initialProfile }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [profile, setProfile] = useState<any | null>(initialProfile || null);
  const [loading, setLoading] = useState(!initialUser);
  const supabase = createClientSupabaseClient();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      if (!initialUser) {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
        
        if (session?.user && !initialProfile) {
          // Fetch profile
          const { data: profileData } = await supabase
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
            .eq("id", session.user.id)
            .single();
          
          setProfile(profileData);
        }
        
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
        
        if (session?.user) {
          // Fetch updated profile when user signs in
          const { data: profileData } = await supabase
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
            .eq("id", session.user.id)
            .single();
          
          setProfile(profileData);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, initialUser, initialProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}