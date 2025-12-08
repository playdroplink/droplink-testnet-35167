/**
 * Pi Network Mainnet Authentication Service
 * 
 * Handles:
 * - Pi access token validation with Mainnet API
 * - User profile retrieval from Pi
 * - Supabase profile linking
 * - Complete authentication flow
 */

import { supabase } from "@/integrations/supabase/client";
import { PI_CONFIG } from "@/config/pi-config";

/**
 * Validates Pi access token by querying Pi Mainnet API
 * Uses: https://api.minepi.com/v2/me
 */
export async function validatePiAccessToken(accessToken: string) {
  if (!accessToken) {
    throw new Error('Missing Pi access token');
  }

  console.log('[Pi Auth Service] 🔐 Validating Pi access token with Mainnet API...');
  
  try {
    const response = await fetch(PI_CONFIG.ENDPOINTS.ME, {
      method: 'GET',
      headers: PI_CONFIG.getAuthHeaders(accessToken),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Pi Auth Service] ❌ Token validation failed: ${response.status}`, errorText);
      throw new Error(`Pi API returned ${response.status}: ${errorText}`);
    }

    const piData = await response.json();
    console.log(`[Pi Auth Service] ✅ Token validated. Pi user:`, piData.username);
    
    return piData;
  } catch (error: any) {
    console.error('[Pi Auth Service] ❌ Failed to validate Pi token:', error);
    throw new Error(`Failed to validate Pi access token: ${error.message}`);
  }
}

/**
 * Gets extended Pi user profile information
 * Retrieves: username, wallet addresses, and other Pi user metadata
 */
export async function getPiUserProfile(accessToken: string) {
  const piData = await validatePiAccessToken(accessToken);
  
  return {
    uid: piData.uid,
    username: piData.username,
    wallet_address: piData.wallet_address || null,
    meta: piData.meta || {},
    // Add any other Pi user fields needed
  };
}

/**
 * Links a Pi user to a Supabase profile
 * Creates profile if it doesn't exist for Pi-only users
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
    // First, try to find existing profile by Pi username
    const { data: existingProfile, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .eq('pi_username', piData.username)
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
          pi_user_id: piData.uid,
          pi_username: piData.username,
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

    // If profile doesn't exist and we're allowed to create
    if (createIfNotExists) {
      console.log('[Pi Auth Service] 📝 Creating new Supabase profile for Pi user...');
      
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([
          {
            username: piData.username,
            display_name: displayName || piData.username,
            pi_user_id: piData.uid,
            pi_username: piData.username,
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
 * Complete Pi authentication flow:
 * 1. Validate Pi access token
 * 2. Get Pi user profile
 * 3. Link to Supabase
 * 4. Return authenticated user data
 */
export async function authenticatePiUser(accessToken: string, options?: any) {
  console.log('[Pi Auth Service] 🔐 Starting Pi Mainnet authentication flow...');
  
  try {
    // Step 1: Validate token and get Pi user data
    const piData = await getPiUserProfile(accessToken);
    console.log('[Pi Auth Service] ✅ Step 1: Pi user profile retrieved');

    // Step 2: Link to Supabase
    const supabaseProfile = await linkPiUserToSupabase(piData, options);
    console.log('[Pi Auth Service] ✅ Step 2: Supabase profile linked/created');

    // Step 3: Return complete authentication result
    const result = {
      success: true,
      piUser: piData,
      supabaseProfile: supabaseProfile,
      accessToken: accessToken,
    };

    console.log('[Pi Auth Service] ✅ Pi Mainnet authentication complete!');
    return result;
  } catch (error: any) {
    console.error('[Pi Auth Service] ❌ Authentication failed:', error);
    throw error;
  }
}

/**
 * Verify that a stored Pi access token is still valid
 * Used for auto-login/session persistence
 */
export async function verifyStoredPiToken(accessToken: string): Promise<boolean> {
  try {
    await validatePiAccessToken(accessToken);
    console.log('[Pi Auth Service] ✅ Stored Pi token is valid');
    return true;
  } catch (error) {
    console.warn('[Pi Auth Service] ⚠️ Stored Pi token is invalid, will need re-authentication');
    return false;
  }
}

/**
 * Get Pi user wallet information
 * Includes: wallet address, balance, assets
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
