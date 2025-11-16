// @ts-ignore - Deno runtime types (available at runtime)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - ESM module (available at runtime)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore - Deno module (available at runtime)
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const walletIncrementSchema = z.object({
  profileId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().min(1).max(200),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const validationResult = walletIncrementSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request data',
        details: validationResult.error.errors 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { profileId, amount, reason } = validationResult.data;

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid or expired token');
    }

    // Verify profile ownership
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serviceSupabase = createClient(supabaseUrl, serviceKey);
    
    const { data: profile, error: profileError } = await serviceSupabase
      .from('profiles')
      .select('id, user_id')
      .eq('id', profileId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      throw new Error('Profile not found or access denied');
    }

    // Call the secure server function to increment balance
    const { data, error } = await serviceSupabase.rpc('increment_wallet_balance', {
      p_profile_id: profileId,
      p_amount: amount,
      p_reason: reason,
    });

    if (error) {
      throw new Error(`Failed to increment wallet: ${error.message}`);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Wallet balance incremented successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

