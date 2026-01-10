/**
 * Pi Network Authentication Service (Mainnet or Sandbox)
 *
 * Handles:
 * - Pi access token validation with the active Pi API
 * - User profile retrieval from Pi
 * - Supabase profile linking
 * - Complete authentication flow
 */

import { supabase } from "@/integrations/supabase/client";
import { PI_CONFIG } from "@/config/pi-config";

const networkLabel = PI_CONFIG.SANDBOX_MODE ? 'Sandbox' : 'Mainnet';

/**
 * Validates Pi access token by querying Pi API through backend
 * Uses Supabase Edge Function for secure server-side validation
 * Falls back to direct API call if edge function is unavailable
 */
export async function validatePiAccessToken(accessToken: string) {
  if (!accessToken) {
    throw new Error('Missing Pi access token');
  }

  console.log(`[Pi Auth Service] 🔐 Validating Pi access token with ${networkLabel} backend...`);
  
  try {
    // Try using Supabase Edge Function for secure server-side token validation
    const { data, error } = await supabase.functions.invoke('pi-auth', {
      body: { accessToken }
    });

    if (error) {
      console.warn(`[Pi Auth Service] ⚠️ Edge function error:`, error);
      
      // If edge function is not available, fall back to direct API call
      if (error.message?.includes('404') || error.message?.includes('FunctionsRelayError')) {
        console.log(`[Pi Auth Service] 🔄 Falling back to direct Pi API validation...`);
        return await validatePiAccessTokenDirect(accessToken);
      }
      
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        throw new Error(`Pi authentication failed: Invalid or expired token`);
      }
      
      throw new Error(`Backend validation failed: ${error.message}`);
    }

    if (!data || !data.piUser) {
      console.warn(`[Pi Auth Service] ⚠️ Invalid response from backend:`, data);
      // Fall back to direct API call
      console.log(`[Pi Auth Service] 🔄 Falling back to direct Pi API validation...`);
      return await validatePiAccessTokenDirect(accessToken);
    }

    const piData = data.piUser;
    console.log(`[Pi Auth Service] ✅ Token validated via edge function. Pi user:`, piData.username);
    
    return piData;
  } catch (error: any) {
    const isFetchError = error?.message?.toLowerCase().includes('failed to fetch');
    const networkHint = PI_CONFIG.SANDBOX_MODE
      ? 'Check sandbox API URL, Pi Browser network connectivity, and ensure HTTPS is allowed.'
      : 'Check mainnet connectivity and API URL.';

    console.error('[Pi Auth Service] ❌ Failed to validate Pi token:', error, networkHint);
    throw new Error(
      isFetchError
        ? `Failed to validate Pi access token: network request failed. ${networkHint}`
        : `Failed to validate Pi access token: ${error.message}. ${networkHint}`
    );
  }
}

/**
 * Direct Pi API validation (fallback method)
 * Note: This may not work from browser due to CORS restrictions
 */
async function validatePiAccessTokenDirect(accessToken: string) {
  const endpoint = PI_CONFIG.ENDPOINTS.ME;
  console.log(`[Pi Auth Service] 🌐 Calling Pi API directly at ${endpoint}...`);
  
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    mode: 'cors',
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    
    if (response.status === 401) {
      console.error(`[Pi Auth Service] ❌ Direct API validation failed: 401 Unauthorized`);
      throw new Error(`Pi authentication failed: Invalid or expired token`);
    }
    
    console.error(`[Pi Auth Service] ❌ Direct API validation failed: ${response.status}`, errorText);
    throw new Error(`Pi API returned ${response.status}: ${errorText}`);
  }

  const piData = await response.json();
  console.log(`[Pi Auth Service] ✅ Token validated directly. Pi user:`, piData.username);
  
  return piData;
}

/**
 * Gets extended Pi user profile information
 */
export async function getPiUserProfile(accessToken: string) {
  const piData = await validatePiAccessToken(accessToken);
  
  return {
    uid: piData.uid,
    username: piData.username,
    wallet_address: piData.wallet_address || null,
    meta: piData.meta || {},
  };
}

/**
 * Links a Pi user to a Supabase profile
 */
export async function linkPiUserToSupabase(
  piData: any,
  options?: {
    createIfNotExists?: boolean;
    displayName?: string;
  }
) {
  const { createIfNotExists = true, displayName } = options || {};
  
  console.log('[Pi Auth Service] 🔗 Linking Pi user to Supabase profile...');
  console.log(`[Pi Auth Service] Pi username: ${piData.username}`);

  try {
    // Find existing profile by username
    const { data: existingProfile, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', piData.username)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('[Pi Auth Service] ❌ Error checking existing profile:', selectError);
      throw selectError;
    }

    if (existingProfile) {
      console.log('[Pi Auth Service] ✅ Found existing Supabase profile');
      
      // Update profile with latest Pi data
      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({
          pi_wallet_address: piData.wallet_address || existingProfile.pi_wallet_address,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProfile.id)
        .select()
        .single();

      if (updateError) {
        console.error('[Pi Auth Service] ❌ Error updating profile:', updateError);
        throw updateError;
      }

      console.log('[Pi Auth Service] ✅ Profile updated with Pi data');
      return updated;
    }

    // Create new profile if allowed
    if (createIfNotExists) {
      console.log('[Pi Auth Service] 📝 Creating new Supabase profile for Pi user...');
      
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([
          {
            username: piData.username,
            business_name: displayName || piData.username,
            pi_wallet_address: piData.wallet_address || null,
            theme_settings: {
              primaryColor: '#3b82f6',
              backgroundColor: '#000000',
              backgroundType: 'color',
              customLinks: [],
            },
          },
        ])
        .select()
        .single();

      if (createError) {
        console.error('[Pi Auth Service] ❌ Error creating profile:', createError);
        throw createError;
      }

      console.log('[Pi Auth Service] ✅ New profile created for Pi user');
      return newProfile;
    }

    throw new Error('No profile found and profile creation is disabled');
  } catch (error: any) {
    console.error('[Pi Auth Service] ❌ Failed to link Pi user to Supabase:', error);
    throw error;
  }
}

/**
 * Complete Pi authentication flow
 * Uses Supabase Edge Function for secure authentication
 * Falls back to manual flow if edge function is unavailable
 */
export async function authenticatePiUser(accessToken: string, options?: any) {
  console.log(`[Pi Auth Service] 🔐 Starting Pi ${networkLabel} authentication flow...`);
  
  try {
    // Try calling the edge function which handles both Pi API validation and Supabase profile creation
    const { data, error } = await supabase.functions.invoke('pi-auth', {
      body: { accessToken }
    });

    if (error) {
      console.warn('[Pi Auth Service] ⚠️ Edge function error:', error);
      
      // If edge function is not available, use manual flow
      if (error.message?.includes('404') || error.message?.includes('FunctionsRelayError')) {
        console.log('[Pi Auth Service] 🔄 Falling back to manual authentication flow...');
        return await authenticatePiUserManual(accessToken, options);
      }
      
      throw new Error(`Pi authentication failed: ${error.message}`);
    }

    if (!data || !data.success || !data.piUser) {
      console.warn('[Pi Auth Service] ⚠️ Invalid edge function response:', data);
      console.log('[Pi Auth Service] 🔄 Falling back to manual authentication flow...');
      return await authenticatePiUserManual(accessToken, options);
    }

    console.log(`[Pi Auth Service] ✅ Pi ${networkLabel} authentication complete via edge function!`);

    const result = {
      success: true,
      piUser: data.piUser,
      supabaseProfile: data.profile,
      accessToken: accessToken,
    };

    return result;
  } catch (error: any) {
    console.error('[Pi Auth Service] ❌ Authentication failed:', error);
    throw error;
  }
}

/**
 * Manual authentication flow (fallback)
 */
async function authenticatePiUserManual(accessToken: string, options?: any) {
  console.log(`[Pi Auth Service] 🔐 Using manual authentication flow...`);
  
  const piData = await getPiUserProfile(accessToken);
  console.log('[Pi Auth Service] ✅ Step 1: Pi user profile retrieved');

  const supabaseProfile = await linkPiUserToSupabase(piData, options);
  console.log('[Pi Auth Service] ✅ Step 2: Supabase profile linked/created');

  const result = {
    success: true,
    piUser: piData,
    supabaseProfile: supabaseProfile,
    accessToken: accessToken,
  };

  console.log(`[Pi Auth Service] ✅ Manual authentication complete!`);
  return result;
}

/**
 * Verify that a stored Pi access token is still valid (lightweight check)
 */
export async function verifyStoredPiToken(accessToken: string): Promise<boolean> {
  if (!accessToken) {
    console.warn('[Pi Auth Service] ⚠️ No access token to verify');
    return false;
  }
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(PI_CONFIG.ENDPOINTS.ME, {
      method: 'GET',
      headers: PI_CONFIG.getAuthHeaders(accessToken),
      mode: 'cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (response.ok) {
      console.log('[Pi Auth Service] ✅ Stored Pi token is valid');
      return true;
    } else if (response.status === 401) {
      console.warn('[Pi Auth Service] ⚠️ Token expired or invalid (401)');
      return false;
    }
    return false;
  } catch (error: any) {
    console.warn('[Pi Auth Service] ⚠️ Token check error:', error?.message);
    return false;
  }
}

/**
 * Get Pi user wallet information
 */
export async function getPiUserWallet(accessToken: string) {
  try {
    console.log('[Pi Auth Service] 💰 Fetching Pi user wallet info...');
    
    const response = await fetch(PI_CONFIG.ENDPOINTS.WALLETS, {
      method: 'GET',
      headers: PI_CONFIG.getAuthHeaders(accessToken),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get wallet: ${response.status} - ${errorText}`);
    }

    const walletData = await response.json();
    console.log('[Pi Auth Service] ✅ Wallet data retrieved');
    return walletData;
  } catch (error: any) {
    console.error('[Pi Auth Service] ❌ Failed to get wallet:', error);
    throw error;
  }
}
