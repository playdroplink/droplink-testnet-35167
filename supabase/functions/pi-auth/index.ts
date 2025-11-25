// @ts-ignore - Deno runtime types (available at runtime)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.11.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simplified Pi Auth function for sign-in only
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      throw new Error("Invalid request body - must be valid JSON");
    }

    const { accessToken } = requestBody;

    // Validate required fields
    if (!accessToken || typeof accessToken !== 'string') {
      throw new Error("Missing or invalid accessToken");
    }

    // Verify the access token with Pi API
    let piUserData;
    try {
      const piResponse = await fetch("https://api.minepi.com/v2/me", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!piResponse.ok) {
        const errorText = await piResponse.text();
        console.error("Pi API error:", piResponse.status, errorText);
        throw new Error(`Invalid Pi access token: ${piResponse.status}`);
      }

      piUserData = await piResponse.json();
      console.log("Pi user verified:", JSON.stringify(piUserData));
    } catch (piError) {
      const errorMsg = piError instanceof Error ? piError.message : String(piError);
      console.error("Pi API verification failed:", errorMsg);
      throw new Error(`Failed to verify Pi access token: ${errorMsg}`);
    }

    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL environment variable not set");
    }
    if (!supabaseKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable not set");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Save Pi user data to Supabase
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .upsert({
        username: piUserData.username,
        pi_user_id: piUserData.uid,
        business_name: piUserData.username,
        description: "",
      })
      .select()
      .single();

    if (profileError) {
      console.error("Error saving profile to Supabase:", profileError);
      throw new Error("Failed to save profile to database");
    }

    // Return success response with profile information
    return new Response(
      JSON.stringify({ 
        success: true, 
        profile,
        emailSignIn: false, // Email sign-in is hidden
        emailSignUp: false  // Email sign-up is hidden
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);

    console.error("Pi auth error:", errorMessage);
    if (errorDetails) {
      console.error("Error details:", errorDetails);
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});