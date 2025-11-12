/// <reference path="../.types/deno.d.ts" />
// @ts-ignore - Deno runtime types (available at runtime)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - ESM module (available at runtime)
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
    // Validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      throw new Error("Invalid request body - must be valid JSON");
    }

    const { accessToken, username, uid } = requestBody;

    // Validate required fields
    if (!accessToken || typeof accessToken !== 'string') {
      throw new Error("Missing or invalid accessToken");
    }
    if (!username || typeof username !== 'string' || username.trim() === '') {
      throw new Error("Missing or invalid username");
    }
    if (!uid || typeof uid !== 'string') {
      throw new Error("Missing or invalid uid");
    }

    // Sanitize username (lowercase, alphanumeric and hyphens only)
    const sanitizedUsername = username.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (sanitizedUsername !== username.toLowerCase().trim()) {
      console.warn(`Username sanitized from "${username}" to "${sanitizedUsername}"`);
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

    // Check if profile exists with this Pi username (use sanitized username)
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", sanitizedUsername)
      .maybeSingle();

    if (profileCheckError) {
      console.error("Error checking for existing profile:", JSON.stringify(profileCheckError));
      throw new Error(`Database error: ${profileCheckError.message}`);
    }

    let profileId: string;
    let userId: string | null = null;

    if (existingProfile) {
      profileId = existingProfile.id;
      userId = existingProfile.user_id;
      console.log("Existing profile found:", profileId);
    } else {
      // Create Supabase auth user for Pi user
      // Use a unique email format and random password
      const email = `pi-${sanitizedUsername}@pi-network.local`;
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
            username: sanitizedUsername,
            business_name: sanitizedUsername,
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
        const isDuplicateError = profileError.code === "23505" || 
                                 profileError.message?.includes("duplicate") || 
                                 profileError.message?.includes("unique") ||
                                 profileError.message?.includes("violates unique constraint");
        
        if (isDuplicateError) {
          console.log("Profile already exists with this username, fetching it...");
          // Profile already exists, fetch it
          const { data: existingProfileByUsername, error: fetchError } = await supabase
            .from("profiles")
            .select("*")
            .eq("username", sanitizedUsername)
            .maybeSingle();
          
          if (fetchError) {
            console.error("Error fetching existing profile:", JSON.stringify(fetchError));
            throw new Error(`Failed to fetch existing profile: ${fetchError.message}`);
          }
          
          if (existingProfileByUsername) {
            profileId = existingProfileByUsername.id;
            // Update user_id if it was null
            if (!existingProfileByUsername.user_id && userId) {
              const { error: updateError } = await supabase
                .from("profiles")
                .update({ user_id: userId })
                .eq("id", profileId);
              
              if (updateError) {
                console.warn("Failed to update user_id:", JSON.stringify(updateError));
                // Don't throw - profile exists, that's what matters
              }
            }
            console.log("Using existing profile:", profileId);
          } else {
            // Race condition - profile was deleted between check and insert
            const errorMsg = profileError.message || JSON.stringify(profileError);
            console.error("Profile creation error (duplicate but not found):", errorMsg);
            throw new Error(`Failed to create profile: Profile conflict detected. Please try again.`);
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

    // Ensure profileId is set
    if (!profileId) {
      throw new Error("Profile ID is missing - this should not happen");
    }

    // Return success response with profile information
    return new Response(
      JSON.stringify({ 
        success: true, 
        profileId,
        username: sanitizedUsername,
        userId: userId || null
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