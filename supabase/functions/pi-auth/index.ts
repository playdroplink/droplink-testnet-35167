// Pi Auth Edge Function - Verifies Pi access token and upserts profile
// Docs: https://pi-apps.github.io/community-developer-guide/docs/gettingStarted/piAppPlatform/piAppPlatformSDK/

declare const Deno: any;
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("[PI-AUTH] Incoming request");
    } catch {
      throw new Error("Invalid request body - must be valid JSON");
    }

    const { accessToken } = requestBody;
    if (!accessToken || typeof accessToken !== 'string') {
      throw new Error("Missing or invalid accessToken");
    }

    // Verify the access token with Pi API (MAINNET)
    const piApiUrl = 'https://api.minepi.com/v2/me';
    const piApiKey = Deno.env.get('PI_API_KEY') || Deno.env.get('VITE_PI_API_KEY');

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    };
    if (piApiKey) {
      headers["X-Api-Key"] = piApiKey;
    }

    console.log('[PI-AUTH] Verifying token with Pi API (MAINNET)');
    const piResponse = await fetch(piApiUrl, { headers });
    const piResponseText = await piResponse.text();
    console.log("[PI-AUTH] Pi API response:", piResponse.status);

    if (!piResponse.ok) {
      throw new Error(`Invalid Pi access token: ${piResponse.status} - ${piResponseText}`);
    }

    let piUserData;
    try {
      piUserData = JSON.parse(piResponseText);
    } catch {
      throw new Error("Pi API response is not valid JSON");
    }
    console.log("[PI-AUTH] Pi user verified:", piUserData.username);

    // Supabase setup
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert profile (use pi_user_id as unique key if column exists, otherwise username)
    const profileData: any = {
      username: piUserData.username,
      business_name: piUserData.username,
      description: "",
    };

    // Check if pi_user_id column exists by trying upsert with it
    let profile;
    let profileError;

    // Try upsert with username as conflict target (safe fallback)
    const result = await supabase
      .from("profiles")
      .upsert(profileData, { onConflict: "username" })
      .select()
      .single();

    profile = result.data;
    profileError = result.error;

    if (profileError) {
      console.error("[PI-AUTH] Error saving profile:", profileError);
      throw new Error("Failed to save profile to database");
    }

    return new Response(
      JSON.stringify({
        success: true,
        profile,
        piUser: {
          uid: piUserData.uid,
          username: piUserData.username,
          wallet_address: piUserData.wallet_address || null,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("[PI-AUTH] Error:", errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
