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

  // Get profile from user_id
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
  const TIMEOUT_MS = 45000; // 45 seconds to stay within Pi's 60-second window

  try {
    const { paymentId, metadata } = await req.json();

    if (!paymentId) {
      throw new Error("Payment ID is required");
    }

    console.log('[APPROVAL] 🔄 Payment approval started for:', paymentId);
    console.log('[APPROVAL] Client metadata received:', JSON.stringify(metadata));

    const PI_API_KEY = Deno.env.get('PI_API_KEY');
    if (!PI_API_KEY) {
      throw new Error("PI_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);
    
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
      console.log("Auth check skipped (timeout or error):", authErr instanceof Error ? authErr.message : authErr);
    }

    // Check idempotency - prevent duplicate approvals
    const { data: existingPayment } = await supabase
      .from('payment_idempotency')
      .select('*')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (existingPayment && (existingPayment.status === 'completed' || existingPayment.status === 'approved')) {
      console.log('[APPROVAL] ✅ Payment already processed:', paymentId);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment already processed',
          payment: { id: paymentId, status: existingPayment.status }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Get payment details from Pi API - with timeout
    const getPaymentUrl = `https://api.minepi.com/v2/payments/${paymentId}`;
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 10000); // 10s timeout
    
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
      console.error('[APPROVAL] Pi API fetch error:', fetchErr);
      throw new Error(`Failed to get payment details: ${fetchErr instanceof Error ? fetchErr.message : 'Network error'}`);
    }
    
    // Extract metadata from payment details (Pi SDK provided metadata)
    const piMetadata = paymentDetails?.metadata || {};
    
    // Use client-provided metadata if available, otherwise use Pi SDK metadata
    const clientMetadata = metadata || piMetadata;
    console.log('[APPROVAL] Final metadata:', { piMetadata, clientMetadata, fromClient: !!metadata });

    // Try to get profileId from various sources (prioritize client-provided)
    if (!profileId && clientMetadata?.profileId) {
      profileId = clientMetadata.profileId as string;
      console.log('[APPROVAL] profileId from client metadata:', profileId);
    }

    // If still no profileId, attempt to resolve by username if provided
    if (!profileId && clientMetadata?.username) {
      try {
        const { data: profileByUsername } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', clientMetadata.username as string)
          .maybeSingle();
        if (profileByUsername) {
          profileId = profileByUsername.id;
          console.log('[APPROVAL] profileId resolved from username:', profileId);
        }
      } catch (usernameErr) {
        console.warn('Error resolving username:', usernameErr);
      }
    }

    // Log warning if no profileId found
    if (!profileId) {
      console.warn('Unable to determine profile for payment:', { paymentId, metadata: clientMetadata });
      // Don't throw - allow approval to continue, will be resolved in completion
    }

    // Validate payment status
    if (paymentDetails.status !== 'ready_for_approval') {
      throw new Error(`Payment is not ready for approval. Current status: ${paymentDetails.status}`);
    }

    // Check timeout - must complete before 45 seconds
    const elapsedMs = Date.now() - startTime;
    if (elapsedMs > TIMEOUT_MS) {
      throw new Error(`Payment approval timeout: ${elapsedMs}ms elapsed`);
    }

    // Record payment attempt for idempotency with full metadata
    try {
      await supabase
        .from('payment_idempotency')
        .upsert({
          payment_id: paymentId,
          profile_id: profileId,
          amount: paymentDetails.amount || 0,
          status: 'pending',
          metadata: {
            ...paymentDetails,
            clientMetadata: clientMetadata,
            piMetadata: piMetadata,
            approvedAt: new Date().toISOString()
          },
        }, {
          onConflict: 'payment_id'
        });
    } catch (idempotencyErr) {
      console.warn('[APPROVAL] Idempotency record update warning:', idempotencyErr);
    }

    console.log('[APPROVAL] Idempotency record created:', { 
      paymentId, 
      profileId,
      clientMetadata 
    });

    // Approve the payment with Pi API - CRITICAL: must complete quickly
    const PI_API_BASE_URL = Deno.env.get('PI_API_BASE_URL') || 'https://api.minepi.com';
    const approveUrl = `${PI_API_BASE_URL}/v2/payments/${paymentId}/approve`;
    const approveAbortController = new AbortController();
    const approveTimeoutId = setTimeout(() => approveAbortController.abort(), 15000); // 15s timeout
    
    let approveResponse;
    try {
      approveResponse = await fetch(approveUrl, {
        method: 'POST',
        headers: {
          'Authorization': `key ${PI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: approveAbortController.signal,
      });

      clearTimeout(approveTimeoutId);

      if (!approveResponse.ok) {
        const errorText = await approveResponse.text();
        console.error('[APPROVAL] Pi API error:', approveResponse.status, errorText);
        
        // Try to update idempotency record
        try {
          await supabase
            .from('payment_idempotency')
            .update({ status: 'failed' })
            .eq('payment_id', paymentId);
        } catch (updateErr) {
          console.warn('Error updating failed status:', updateErr);
        }
        
        throw new Error(`Failed to approve payment: ${errorText}`);
      }
    } catch (approveErr) {
      clearTimeout(approveTimeoutId);
      throw new Error(`Approval request failed: ${approveErr instanceof Error ? approveErr.message : 'Network error'}`);
    }

    const paymentData = await approveResponse.json();

    // Update idempotency record with approval details
    try {
      await supabase
        .from('payment_idempotency')
        .update({ status: 'approved' })
        .eq('payment_id', paymentId);
    } catch (updateErr) {
      console.warn('[APPROVAL] Warning updating approved status:', updateErr);
    }

    const totalTime = Date.now() - startTime;
    console.log('[APPROVAL SUCCESS] ✅', {
      paymentId,
      profileId,
      amount: paymentData.amount,
      status: paymentData.status,
      subscriptionPlan: clientMetadata?.subscriptionPlan,
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
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[APPROVAL FAILED] ❌', {
      error: errorMsg,
      totalTimeMs: totalTime
    });
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMsg
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
