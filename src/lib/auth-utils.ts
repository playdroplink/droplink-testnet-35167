import { supabase } from "@/integrations/supabase/client";

/**
 * Comprehensive sign-out utility that handles both Pi Network and Supabase authentication
 */
export const performCompleteSignOut = async (): Promise<void> => {
  try {
    console.log("🚪 Starting complete sign out...");

    // 1. Clear Pi Network authentication data
    localStorage.removeItem('pi_access_token');
    localStorage.removeItem('pi_user');
    
    // 2. Sign out from Supabase (handles Gmail/email authentication)
    const { error: supabaseError } = await supabase.auth.signOut();
    if (supabaseError) {
      console.error("Supabase sign out error:", supabaseError);
      // Continue with logout even if Supabase logout fails
    } else {
      console.log("✅ Supabase sign out successful");
    }
    
    // 3. Clear all authentication-related local storage
    const keysToRemove = [
      'supabase.auth.token',
      'sb-idkjfuctyukspexmijvb-auth-token',
      'sb-idkjfuctyukspexmijvb-auth-token-code-verifier',
      'sb-idkjfuctyukspexmijvb-auth-token-refresh',
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    // 4. Clear any cookies that might persist
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
    
    console.log("🧹 Cleared all authentication data");
    
    // 5. Force reload to ensure clean state
    setTimeout(() => {
      window.location.href = "/auth";
    }, 100);
    
  } catch (error) {
    console.error("Complete sign out error:", error);
    // Force navigation even on error
    window.location.href = "/auth";
  }
};

/**
 * Check if user is authenticated via any method
 */
export const checkAuthenticationStatus = async () => {
  try {
    // Check Supabase session
    const { data: { session }, error } = await supabase.auth.getSession();
    const hasSupabaseAuth = !error && session?.user;
    
    // Check Pi Network authentication
    const piToken = localStorage.getItem('pi_access_token');
    const piUser = localStorage.getItem('pi_user');
    const hasPiAuth = piToken && piUser;
    
    return {
      hasSupabaseAuth: !!hasSupabaseAuth,
      hasPiAuth: !!hasPiAuth,
      supabaseUser: session?.user || null,
      piUser: piUser ? JSON.parse(piUser) : null
    };
  } catch (error) {
    console.error("Auth status check error:", error);
    return {
      hasSupabaseAuth: false,
      hasPiAuth: false,
      supabaseUser: null,
      piUser: null
    };
  }
};