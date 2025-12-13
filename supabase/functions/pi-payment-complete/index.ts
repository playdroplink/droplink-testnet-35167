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

  const startTime = Date.now();
  const TIMEOUT_MS = 45000; // 45 seconds max

  try {
    const { paymentId, txid, metadata } = await req.json();

    if (!paymentId || !txid) {
      throw new Error("Payment ID and transaction ID are required");
    }

    console.log('[COMPLETE] 🔄 Payment completion started:', paymentId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);
    
    const PI_API_KEY = Deno.env.get('PI_API_KEY');
    if (!PI_API_KEY) {
      throw new Error("PI_API_KEY not configured");
    }
    
    let profileId: string | null = null;
    
    // Get authenticated user and profile (optional for Pi users) - with timeout
    try {
      const authResult = await Promise.race([
        getAuthenticatedProfile(req),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), 5000)
        )
      ]);
      
      if (authResult) {
        profileId = authResult.profile.id;
      }
    } catch (authErr) {
      console.log('[COMPLETE] Auth check skipped:', authErr instanceof Error ? authErr.message : authErr);
      if (metadata?.profileId) {
        profileId = metadata.profileId;
      }
    }

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
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Get metadata from idempotency record (stored during approval)
    const storedMetadata = existingPayment?.metadata || {};
    const clientMetadata = storedMetadata?.clientMetadata || {};
    
    console.log('[COMPLETE] Retrieved metadata:', {
      hasStoredMetadata: !!existingPayment?.metadata,
      clientMetadata,
      incomingMetadata: metadata
    });

    // Verify payment status and details with Pi API - with timeout
    const getPaymentUrl = `https://api.minepi.com/v2/payments/${paymentId}`;
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 10000);
    
    let paymentDetails;
    try {
      const getPaymentResponse = await fetch(getPaymentUrl, {
        headers: {
          'Authorization': `Key ${PI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!getPaymentResponse.ok) {
        throw new Error(`Failed to fetch payment: ${getPaymentResponse.statusText}`);
      }

      paymentDetails = await getPaymentResponse.json();
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      throw new Error(`Failed to get payment details: ${fetchErr instanceof Error ? fetchErr.message : 'Network error'}`);
    }
    
    // Validate payment belongs to this profile (if metadata provided)
    if (metadata?.profileId && profileId && metadata.profileId !== profileId) {
      throw new Error('Payment does not belong to authenticated user');
    }
    
    // Use profileId from auth or metadata, or fallback to stored data
    let finalProfileId = profileId || metadata?.profileId || clientMetadata?.profileId;
    if (!finalProfileId && existingPayment?.profile_id) {
      finalProfileId = existingPayment.profile_id;
    }
    
    console.log('[COMPLETE] Profile ID resolution:', {
      fromAuth: profileId,
      fromRequestMetadata: metadata?.profileId,
      fromStoredMetadata: clientMetadata?.profileId,
      final: finalProfileId
    });

    // Validate payment status
    if (paymentDetails.status !== 'ready_for_completion') {
      throw new Error(`Payment is not ready for completion. Current status: ${paymentDetails.status}`);
    }

    // Validate transaction ID matches
    if (paymentDetails.transaction && paymentDetails.transaction.txid !== txid) {
      throw new Error('Transaction ID mismatch');
    }

    // Check timeout
    const elapsedMs = Date.now() - startTime;
    if (elapsedMs > TIMEOUT_MS) {
      throw new Error(`Payment completion timeout: ${elapsedMs}ms elapsed`);
    }

    // Complete the payment with Pi API - CRITICAL: fast response needed
    const PI_API_BASE_URL = Deno.env.get('PI_API_BASE_URL') || 'https://api.minepi.com';
    const completeUrl = `${PI_API_BASE_URL}/v2/payments/${paymentId}/complete`;
    const completeAbortController = new AbortController();
    const completeTimeoutId = setTimeout(() => completeAbortController.abort(), 15000);
    
    let completeResponse;
    try {
      completeResponse = await fetch(completeUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${PI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ txid }),
        signal: completeAbortController.signal,
      });

      clearTimeout(completeTimeoutId);

      if (!completeResponse.ok) {
        const errorText = await completeResponse.text();
        console.error('[COMPLETE] Pi API error:', completeResponse.status, errorText);
        
        throw new Error(`Failed to complete payment: ${completeResponse.status}`);
      }
    } catch (completeErr) {
      clearTimeout(completeTimeoutId);
      throw new Error(`Completion request failed: ${completeErr instanceof Error ? completeErr.message : 'Network error'}`);
    }

    const paymentData = await completeResponse.json();

    // Mark payment as completed in idempotency table
    try {
      await supabase
        .from('payment_idempotency')
        .update({
          status: 'completed',
          txid: txid,
          completed_at: new Date().toISOString(),
          metadata: { ...storedMetadata, ...metadata, paymentData }
        })
        .eq('payment_id', paymentId);
    } catch (updateErr) {
      console.warn('[COMPLETE] Warning updating idempotency:', updateErr);
    }

    // Update subscription in database if this was a subscription payment
    const planType = (clientMetadata?.subscriptionPlan || metadata?.subscriptionPlan || '').toLowerCase();
    const billingPeriod = clientMetadata?.billingPeriod || metadata?.billingPeriod || 'monthly';
    
    if (planType && finalProfileId) {
      const endDate = new Date();
      
      if (billingPeriod === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      console.log('[SUBSCRIPTION] 🎯 Creating/updating subscription:', {
        profileId: finalProfileId,
        planType,
        billingPeriod,
        endDate: endDate.toISOString(),
        amount: paymentData.amount || paymentDetails.amount,
      });

      try {
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
            onConflict: 'profile_id'
          });

        if (subError) {
          console.error('[SUBSCRIPTION] Error creating subscription:', JSON.stringify(subError));
          // Log but don't fail payment - subscription can be retried
        } else {
          console.log('[SUBSCRIPTION] ✅ CREATED/UPDATED:', finalProfileId, planType);
        }
      } catch (subException) {
        console.error('[SUBSCRIPTION] Exception creating subscription:', subException);
        // Don't throw - payment succeeded, subscription issue is secondary
      }
    } else {
      console.warn('[SUBSCRIPTION] ⚠️ Subscription not created - missing data:', { 
        hasPlanType: !!planType,
        hasProfileId: !!finalProfileId,
        clientMetadata,
        requestMetadata: metadata
      });
    }

    const totalTime = Date.now() - startTime;
    console.log('[COMPLETE] ✅ SUCCESS:', {
      paymentId,
      txid: txid.substring(0, 16) + '...',
      profileId: finalProfileId,
      amount: paymentData.amount,
      planType,
      totalTimeMs: totalTime
    });

    return new Response(
      JSON.stringify({ success: true, payment: paymentData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    const totalTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('[COMPLETE] ❌ FAILED:', {
      error: errorMessage,
      totalTimeMs: totalTime
    });
    
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
