// @ts-ignore: Deno global is available at runtime in Supabase Edge Functions
declare const Deno: any;
// @ts-ignore - Deno runtime types (available at runtime)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - ESM module (available at runtime)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { paymentId, txid, metadata } = await req.json();

    if (!paymentId || !txid) {
      throw new Error("Payment ID and transaction ID are required");
    }

    console.log('[COMPLETE] 🔄 Starting completion for:', paymentId);
    console.log('[COMPLETE] Transaction ID:', txid);
    console.log('[COMPLETE] Client metadata:', JSON.stringify(metadata || {}));

    // Get Pi API Key from environment
    const PI_API_KEY = Deno.env.get('PI_API_KEY');
    if (!PI_API_KEY) {
      console.error('[COMPLETE] ❌ PI_API_KEY not configured');
      throw new Error("PI_API_KEY not configured");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check idempotency - prevent duplicate completions
    const { data: existingPayment } = await supabase
      .from('payment_idempotency')
      .select('*')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (existingPayment && existingPayment.status === 'completed') {
      console.log('[COMPLETE] ✅ Payment already completed:', paymentId);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment already completed',
          payment: { id: paymentId, txid: existingPayment.txid, status: 'completed' }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get stored metadata from idempotency record
    const storedMetadata = existingPayment?.metadata || {};
    const finalMetadata = { ...storedMetadata, ...metadata };
    
    console.log('[COMPLETE] Final metadata:', JSON.stringify(finalMetadata));

    // Step 1: Get payment details from Pi API to verify
    console.log('[COMPLETE] 📡 Fetching payment details from Pi API...');
    const getPaymentResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!getPaymentResponse.ok) {
      const errorText = await getPaymentResponse.text();
      console.error('[COMPLETE] ❌ Failed to get payment:', getPaymentResponse.status, errorText);
      throw new Error(`Failed to fetch payment: ${errorText}`);
    }

    const paymentDetails = await getPaymentResponse.json();
    console.log('[COMPLETE] Payment details:', JSON.stringify(paymentDetails));

    // Step 2: Complete the payment with Pi API
    console.log('[COMPLETE] 📡 Completing payment with Pi API...');
    const completeResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ txid }),
    });

    if (!completeResponse.ok) {
      const errorText = await completeResponse.text();
      console.error('[COMPLETE] ❌ Pi API completion failed:', completeResponse.status, errorText);
      throw new Error(`Pi API completion failed: ${errorText}`);
    }

    const completionResult = await completeResponse.json();
    console.log('[COMPLETE] ✅ Pi API completion result:', JSON.stringify(completionResult));

    // Mark payment as completed in idempotency table
    await supabase
      .from('payment_idempotency')
      .upsert({
        payment_id: paymentId,
        profile_id: existingPayment?.profile_id || finalMetadata.profileId,
        status: 'completed',
        txid: txid,
        metadata: {
          ...finalMetadata,
          completedAt: new Date().toISOString(),
          completionResult
        }
      }, { onConflict: 'payment_id' });

    // Create subscription if this was a subscription payment
    const planType = (finalMetadata.subscriptionPlan || '').toLowerCase();
    const billingPeriod = finalMetadata.billingPeriod || 'monthly';
    let profileId = existingPayment?.profile_id || finalMetadata.profileId;

    // Try to resolve profileId from username if not available
    if (!profileId && finalMetadata.username) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', finalMetadata.username)
        .maybeSingle();
      
      if (profile) {
        profileId = profile.id;
        console.log('[COMPLETE] Resolved profileId from username:', profileId);
      }
    }

    if (planType && profileId && planType !== 'free') {
      const endDate = new Date();
      if (billingPeriod === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      console.log('[SUBSCRIPTION] 🎯 Creating subscription:', {
        profileId,
        planType,
        billingPeriod,
        endDate: endDate.toISOString(),
        amount: paymentDetails.amount
      });

      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          profile_id: profileId,
          plan_type: planType,
          billing_period: billingPeriod,
          pi_amount: paymentDetails.amount || 0,
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
          status: 'active',
          auto_renew: true,
        }, { onConflict: 'profile_id' });

      if (subError) {
        console.error('[SUBSCRIPTION] ❌ Error creating subscription:', JSON.stringify(subError));
      } else {
        console.log('[SUBSCRIPTION] ✅ Subscription created for:', profileId);
      }
    } else {
      console.log('[SUBSCRIPTION] ⚠️ Skipping subscription creation:', {
        hasPlanType: !!planType,
        hasProfileId: !!profileId,
        planType
      });
    }

    const totalTime = Date.now() - startTime;
    console.log('[COMPLETE] ✅ SUCCESS in', totalTime, 'ms:', {
      paymentId,
      txid: txid.substring(0, 16) + '...',
      profileId,
      planType
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        payment: completionResult,
        message: 'Payment completed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    const totalTime = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[COMPLETE] ❌ FAILED in', totalTime, 'ms:', errorMsg);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMsg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
