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

    // Check if email is verified for Supabase users
    let isEmailVerified = false;
    if (hasSupabaseAuth) {
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('email_verified')
        .eq('id', session.user.id)
        .single();

      if (!profileError && userProfile?.email_verified) {
        isEmailVerified = true;
      }
    }

    // Check Pi Network authentication
    const piToken = localStorage.getItem('pi_access_token');
    const piUser = localStorage.getItem('pi_user');
    const hasPiAuth = piToken && piUser;

    return {
      hasSupabaseAuth: !!hasSupabaseAuth,
      hasPiAuth: !!hasPiAuth,
      isEmailVerified,
      supabaseUser: session?.user || null,
      piUser: piUser ? JSON.parse(piUser) : null
    };
  } catch (error) {
    console.error("Auth status check error:", error);
    return {
      hasSupabaseAuth: false,
      hasPiAuth: false,
      isEmailVerified: false,
      supabaseUser: null,
      piUser: null
    };
  }
};

/**
 * Authenticate a user via Pi Network
 */
export const authenticatePiUser = async () => {
  try {
    const scopes = ['payments']; // Request permissions for payments

    // Handle incomplete payments (if any)
    const onIncompletePaymentFound = (payment) => {
      console.warn('Incomplete payment found:', payment);
    };

    // Authenticate the user
    const auth = await Pi.authenticate(scopes, onIncompletePaymentFound);
    console.log('Pi Network authentication successful:', auth);

    return auth;
  } catch (error) {
    console.error('Pi Network authentication failed:', error);
    throw error;
  }
};

/**
 * Request a payment from the user to the app
 */
export const requestPiPayment = async (amount, memo, metadata) => {
  try {
    const payment = await Pi.createPayment(
      {
        amount,
        memo,
        metadata,
      },
      {
        onReadyForServerApproval: (paymentId) => {
          console.log('Payment ready for server approval:', paymentId);
        },
        onReadyForServerCompletion: (paymentId, txid) => {
          console.log('Payment ready for server completion:', paymentId, txid);
        },
        onCancel: (paymentId) => {
          console.warn('Payment canceled:', paymentId);
        },
        onError: (error, payment) => {
          console.error('Payment error:', error, payment);
        },
      }
    );

    console.log('Payment initiated:', payment);
    return payment;
  } catch (error) {
    console.error('Failed to initiate payment:', error);
    throw error;
  }
};