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
    let userId: string | null = null;

    if (existingProfile) {
      profileId = existingProfile.id;
      userId = existingProfile.user_id;
    } else {
      // Create Supabase auth user for Pi user
      // Use a unique email format and random password
      const email = `pi-${username}@pi-network.local`;
      const randomPassword = crypto.randomUUID();
      
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          pi_username: username,
          pi_uid: uid,
        },
      });

      if (authError) {
        if (authError.message.includes("already registered") || authError.message.includes("User already registered")) {
          // User already exists, try to find them
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const existingUser = existingUsers?.users?.find(u => u.email === email);
          if (existingUser) {
            userId = existingUser.id;
            console.log("Found existing auth user for Pi user:", userId);
          }
        } else {
          console.error("Auth user creation error:", authError);
          // Continue without auth user if creation fails
        }
      } else if (authUser?.user) {
        userId = authUser.user.id;
        console.log("Created auth user for Pi user:", userId);
      }

      // Create new profile with user_id
      const { data: newProfile, error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: userId,
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