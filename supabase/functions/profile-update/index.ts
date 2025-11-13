/// <reference path="../.types/deno.d.ts" />
// @ts-ignore - Deno runtime types (available at runtime)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - ESM module (available at runtime)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function getProfileFromPiToken(piAccessToken: string, requestedUsername?: string) {
  if (!piAccessToken) {
    throw new Error('Missing Pi access token');
  }

  const piResponse = await fetch('https://api.minepi.com/v2/me', {
    headers: {
      'Authorization': `Bearer ${piAccessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!piResponse.ok) {
    throw new Error('Failed to validate Pi access token');
  }

  const piData = await piResponse.json();
  const piUsername = piData?.username;

  if (!piUsername) {
    throw new Error('Pi user data missing username');
  }

  if (requestedUsername && requestedUsername !== piUsername) {
    console.warn(`Requested username ${requestedUsername} does not match Pi user ${piUsername}. Using Pi user.`);
  }

  const { data: profile, error } = await serviceSupabase
    .from('profiles')
    .select('id, username')
    .eq('username', requestedUsername || piUsername)
    .maybeSingle();

  if (error || !profile) {
    throw new Error('Profile not found for Pi user');
  }

  return profile;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const body = await req.json();
    const { username, profileData, piAccessToken } = body;

    if (!username || !profileData) {
      throw new Error("Missing required fields");
    }

    let profile;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      if (authError || !user) {
        throw new Error('Invalid or expired token');
      }

      const { data: profileDataResult, error: profileError } = await serviceSupabase
        .from('profiles')
        .select('id, user_id, username')
        .eq('username', username)
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError || !profileDataResult) {
        throw new Error('Profile not found or access denied');
      }

      profile = profileDataResult;
    } else {
      const tokenFromHeader = req.headers.get('x-pi-access-token') || piAccessToken;
      if (!tokenFromHeader) {
        throw new Error('Missing or invalid authorization header');
      }
      profile = await getProfileFromPiToken(tokenFromHeader, username);
    }

    // Update profile using service role (bypasses RLS)
    const { data, error } = await serviceSupabase
      .from("profiles")
      .update({
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .eq("id", profile.id)
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Profile update error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

