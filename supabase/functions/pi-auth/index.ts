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
    console.log("Pi user verified:", JSON.stringify(piUserData));

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
                console.error("Error listing users:", JSON.stringify(listError));
                // Continue without userId - profile can be created without it
              }
            } catch (lookupError) {
              const errorMsg = lookupError instanceof Error ? lookupError.message : String(lookupError);
              console.error("Exception during user lookup:", errorMsg);
              // Continue without userId - profile can be created without it
            }
          } else {
            console.error("Auth user creation error:", authError.message || JSON.stringify(authError));
            // Continue without auth user if creation fails - profile can still be created
          }
        } else if (authUser?.user) {
          userId = authUser.user.id;
          console.log("Created auth user for Pi user:", userId);
        }
      } catch (authException) {
        const errorMsg = authException instanceof Error ? authException.message : String(authException);
        console.error("Exception during auth user creation:", errorMsg);
        // Continue without userId - profile can be created without it
      }

      // Create new profile with user_id (can be null)
      // Try to create profile, handle duplicate username errors
      let newProfile;
      let profileError;
      
      try {
        const result = await supabase
          .from("profiles")
          .insert({
            user_id: userId,
            username: username,
            business_name: username,
            description: "",
          })
          .select()
          .single();
        
        newProfile = result.data;
        profileError = result.error;
      } catch (insertError) {
        profileError = insertError;
      }

      if (profileError) {
        // Check if it's a duplicate username error
        if (profileError.code === "23505" || profileError.message?.includes("duplicate") || profileError.message?.includes("unique")) {
          console.log("Profile already exists with this username, fetching it...");
          // Profile already exists, fetch it
          const { data: existingProfileByUsername } = await supabase
            .from("profiles")
            .select("*")
            .eq("username", username)
            .maybeSingle();
          
          if (existingProfileByUsername) {
            profileId = existingProfileByUsername.id;
            // Update user_id if it was null
            if (!existingProfileByUsername.user_id && userId) {
              await supabase
                .from("profiles")
                .update({ user_id: userId })
                .eq("id", profileId);
            }
            console.log("Using existing profile:", profileId);
          } else {
            const errorMsg = profileError.message || JSON.stringify(profileError);
            console.error("Profile creation error:", errorMsg);
            throw new Error(`Failed to create profile: ${errorMsg}`);
          }
        } else {
          const errorMsg = profileError.message || JSON.stringify(profileError);
          console.error("Profile creation error:", errorMsg);
          throw new Error(`Failed to create profile: ${errorMsg}`);
        }
      } else if (newProfile && newProfile.id) {
        profileId = newProfile.id;
        console.log("Created new profile:", profileId);
      } else {
        throw new Error("Profile creation failed - no profile ID returned");
      }
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    
    console.error("Pi auth error:", errorMessage);
    if (errorDetails) {
      console.error("Error details:", errorDetails);
    }
    
    // Check if we're in development mode (Deno environment)
    const isDevelopment = Deno.env.get('DENO_ENV') === 'development' || 
                          Deno.env.get('ENVIRONMENT') === 'development';
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: isDevelopment ? errorDetails : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});