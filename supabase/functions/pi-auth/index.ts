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
      
      try {
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
          // Check if user already exists
          if (authError.message.includes("already registered") || 
              authError.message.includes("User already registered") ||
              authError.message.includes("already exists") ||
              authError.message.includes("duplicate")) {
            try {
              // Try to find existing user by listing users with pagination
              const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({
                page: 1,
                perPage: 1000
              });
              
              if (!listError && existingUsers?.users) {
                const existingUser = existingUsers.users.find(u => u.email === email);
                if (existingUser) {
                  userId = existingUser.id;
                  console.log("Found existing auth user for Pi user:", userId);
                } else {
                  console.warn("User email exists but not found in list - continuing without userId");
                }
              } else if (listError) {
                console.error("Error listing users:", listError);
                // Continue without userId - profile can be created without it
              }
            } catch (lookupError) {
              console.error("Exception during user lookup:", lookupError);
              // Continue without userId - profile can be created without it
            }
          } else {
            console.error("Auth user creation error:", authError.message);
            // Continue without auth user if creation fails - profile can still be created
          }
        } else if (authUser?.user) {
          userId = authUser.user.id;
          console.log("Created auth user for Pi user:", userId);
        }
      } catch (authException) {
        console.error("Exception during auth user creation:", authException);
        // Continue without userId - profile can be created without it
      }

      // Create new profile with user_id (can be null)
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

      if (profileError) {
        console.error("Profile creation error:", profileError);
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }
      
      if (!newProfile || !newProfile.id) {
        throw new Error("Profile creation failed - no profile ID returned");
      }
      
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    
    console.error("Error details:", errorDetails);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: process.env.DENO_ENV === 'development' ? errorDetails : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});