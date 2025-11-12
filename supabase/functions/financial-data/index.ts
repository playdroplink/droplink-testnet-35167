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

    // Get profile for user
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serviceSupabase = createClient(supabaseUrl, serviceKey);
    
    const { data: profile, error: profileError } = await serviceSupabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    const method = req.method;
    
    if (method === 'GET') {
      // Read financial data
      const { data: financialData, error } = await serviceSupabase
        .from('profile_financial_data')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch financial data: ${error.message}`);
      }

      return new Response(JSON.stringify({ 
        success: true,
        data: financialData || {
          profile_id: profile.id,
          pi_wallet_address: null,
          pi_donation_message: 'Send me a coffee ☕',
          crypto_wallets: {},
          bank_details: {}
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else if (method === 'PUT' || method === 'POST') {
      // Update financial data
      const body = await req.json();
      
      const { data: financialData, error } = await serviceSupabase
        .from('profile_financial_data')
        .upsert({
          profile_id: profile.id,
          pi_wallet_address: body.pi_wallet_address || null,
          pi_donation_message: body.pi_donation_message || 'Send me a coffee ☕',
          crypto_wallets: body.crypto_wallets || {},
          bank_details: body.bank_details || {},
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'profile_id'
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update financial data: ${error.message}`);
      }

      return new Response(JSON.stringify({ 
        success: true,
        data: financialData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      throw new Error('Method not allowed');
    }

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

