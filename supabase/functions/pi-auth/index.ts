import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessToken, username, uid } = await req.json();

    if (!accessToken || !username || !uid) {
      throw new Error("Missing required fields");
    }

    // Verify the access token with Pi API
    const piResponse = await fetch("https://api.minepi.com/v2/me", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!piResponse.ok) {
      throw new Error("Invalid Pi access token");
    }

    const piUserData = await piResponse.json();
    console.log("Pi user verified:", piUserData);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if profile exists with this Pi username
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    let profileId: string;

    if (existingProfile) {
      profileId = existingProfile.id;
    } else {
      // Create new profile
      const { data: newProfile, error: profileError } = await supabase
        .from("profiles")
        .insert({
          username: username,
          business_name: username,
          description: "",
        })
        .select()
        .single();

      if (profileError) throw profileError;
      profileId = newProfile.id;

      console.log("Created new profile:", profileId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        profileId,
        username 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Pi auth error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});