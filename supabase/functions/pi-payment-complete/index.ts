// @ts-ignore - Deno runtime types (available at runtime)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - ESM module (available at runtime)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to get authenticated user and profile (optional for Pi users)
async function getAuthenticatedProfile(req: Request) {
  const authHeader = req.headers.get('Authorization');
  
  // If no auth header, return null (for Pi users without Supabase session)
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Verify JWT and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return null; // Return null instead of throwing - allows Pi users without session
  }

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const serviceSupabase = createClient(supabaseUrl, serviceKey);
  
  const { data: profile, error: profileError } = await serviceSupabase
    .from('profiles')
    .select('id, username')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return null; // Return null if profile not found
  }

  return { user, profile, supabase: serviceSupabase };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentId, txid, metadata } = await req.json();

    if (!paymentId || !txid) {
      throw new Error("Payment ID and transaction ID are required");
    }

    // Get authenticated user and profile (optional for Pi users)
    const authResult = await getAuthenticatedProfile(req);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);
    
    let profileId: string | null = null;
    
    if (authResult) {
      // User has Supabase session - use their profile
      profileId = authResult.profile.id;
    } else {
      // No Supabase session - will use metadata.profileId if available
      if (metadata?.profileId) {
        profileId = metadata.profileId;
      }
      console.log("Payment completion without Supabase session (Pi user)");
    }

    // Check idempotency - prevent duplicate completions
    const { data: existingPayment } = await supabase
      .from('payment_idempotency')
      .select('*')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (existingPayment && existingPayment.status === 'completed') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment already completed',
          payment: { id: paymentId, txid: existingPayment.txid, status: 'completed' }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Validate payment with Pi API
    const PI_API_KEY = Deno.env.get('PI_API_KEY');
    if (!PI_API_KEY) {
      throw new Error("PI_API_KEY not configured");
    }

    // Verify payment status and details with Pi API
    const getPaymentUrl = `https://api.minepi.com/v2/payments/${paymentId}`;
    const getPaymentResponse = await fetch(getPaymentUrl, {
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!getPaymentResponse.ok) {
      throw new Error(`Failed to fetch payment: ${getPaymentResponse.statusText}`);
    }

    const paymentDetails = await getPaymentResponse.json();
    
    // Validate payment belongs to this profile (if metadata provided)
    if (metadata?.profileId && profileId && metadata.profileId !== profileId) {
      throw new Error('Payment does not belong to authenticated user');
    }
    
    // Use profileId from auth or metadata
    const finalProfileId = profileId || metadata?.profileId;

    // Validate payment status
    if (paymentDetails.status !== 'ready_for_completion') {
      throw new Error(`Payment is not ready for completion. Current status: ${paymentDetails.status}`);
    }

    // Validate transaction ID matches
    if (paymentDetails.transaction && paymentDetails.transaction.txid !== txid) {
      throw new Error('Transaction ID mismatch');
    }

    // Complete the payment with Pi API
    const completeUrl = `https://api.minepi.com/v2/payments/${paymentId}/complete`;
    
    const response = await fetch(completeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ txid }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorMessage = `Failed to complete payment: ${response.status} ${errorText}`;
      
      // Update idempotency record
      try {
        await supabase
          .from('payment_idempotency')
          .update({ status: 'failed' })
          .eq('payment_id', paymentId);
      } catch (idempotencyError) {
        // Log but don't throw - payment failure is more important
        console.error("Error updating idempotency:", idempotencyError);
      }
      
      throw new Error(errorMessage);
    }

    const paymentData = await response.json();

    // Mark payment as completed in idempotency table
    await supabase
      .from('payment_idempotency')
      .update({
        status: 'completed',
        txid: txid,
        completed_at: new Date().toISOString(),
        metadata: { ...metadata, paymentData }
      })
      .eq('payment_id', paymentId);

    // Update subscription in database if this was a subscription payment
    if (metadata?.subscriptionPlan && finalProfileId) {
      const planType = metadata.subscriptionPlan.toLowerCase();
      const billingPeriod = metadata.billingPeriod || 'monthly';
      const endDate = new Date();
      
      if (billingPeriod === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      const { error: subError } = await supabase
        .from("subscriptions")
        .upsert({
          profile_id: finalProfileId,
          plan_type: planType,
          billing_period: billingPeriod,
          pi_amount: paymentData.amount || paymentDetails.amount,
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
          status: "active",
          auto_renew: true,
        }, {
          onConflict: 'profile_id,plan_type'
        });

      if (subError) {
        // Log error but don't fail payment - subscription can be fixed later
        console.error("Subscription creation error (non-critical):", JSON.stringify(subError));
      }
    }

    return new Response(
      JSON.stringify({ success: true, payment: paymentData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    
    // Log error with details (but don't expose stack in production)
    console.error("Payment completion error:", errorMessage);
    if (Deno.env.get('DENO_ENV') === 'development') {
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
