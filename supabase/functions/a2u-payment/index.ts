// A2U (App-to-User) Payment Edge Function
// Allows the app to send Pi to users
// Based on Pi Platform API: POST /v2/payments with direction "app_to_user"
// Docs: https://pi-apps.github.io/community-developer-guide/

declare const Deno: any;
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PI_SANDBOX_MODE = (Deno.env.get('PI_SANDBOX_MODE') || 'false') === 'true';
const PI_API_BASE_URL = PI_SANDBOX_MODE ? "https://api.testnet.minepi.com" : "https://api.minepi.com";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const PI_API_KEY = Deno.env.get('PI_API_KEY') || Deno.env.get('VITE_PI_API_KEY');
    if (!PI_API_KEY) {
      console.error('[A2U] ❌ PI_API_KEY not configured');
      throw new Error('PI_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Supabase configuration missing');
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    // Parse body once
    const body = await req.json();
    const action = body.action || 'list';

    console.log('[A2U] Action:', action);

    // ============ ACTION: CREATE A2U PAYMENT ============
    if (action === 'create') {
      const { amount, memo, metadata, recipientUid } = body;

      if (!amount || amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      if (!recipientUid) {
        throw new Error('Recipient UID is required');
      }
      if (!memo) {
        throw new Error('Memo is required');
      }

      console.log('[A2U] 📤 Creating A2U payment:', { amount, memo, recipientUid });

      // Step 1: Create A2U payment via Pi API
      const createResponse = await fetch(`${PI_API_BASE_URL}/v2/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${PI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment: {
            amount: amount,
            memo: memo,
            metadata: metadata || {},
            uid: recipientUid,
          }
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('[A2U] ❌ Pi API create failed:', createResponse.status, errorText);
        throw new Error(`Pi API create failed (${createResponse.status}): ${errorText}`);
      }

      const paymentData = await createResponse.json();
      console.log('[A2U] ✅ A2U payment created:', JSON.stringify(paymentData));

      const paymentId = paymentData.identifier || paymentData.id;

      // Record in idempotency table
      await supabase.from('payment_idempotency').upsert({
        payment_id: paymentId,
        status: 'a2u_created',
        metadata: {
          ...(metadata || {}),
          direction: 'app_to_user',
          amount,
          memo,
          recipientUid,
          createdAt: new Date().toISOString(),
        }
      }, { onConflict: 'payment_id' });

      // Step 2: Approve the A2U payment
      console.log('[A2U] 📡 Approving A2U payment:', paymentId);
      const approveResponse = await fetch(`${PI_API_BASE_URL}/v2/payments/${paymentId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${PI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!approveResponse.ok) {
        const errorText = await approveResponse.text();
        console.error('[A2U] ❌ Pi API approve failed:', approveResponse.status, errorText);
        throw new Error(`Pi API approve failed: ${errorText}`);
      }

      const approvalResult = await approveResponse.json();
      console.log('[A2U] ✅ A2U payment approved:', JSON.stringify(approvalResult));

      // Update idempotency
      await supabase.from('payment_idempotency').update({
        status: 'a2u_approved',
        metadata: {
          ...(metadata || {}),
          direction: 'app_to_user',
          amount,
          memo,
          recipientUid,
          approvedAt: new Date().toISOString(),
        }
      }).eq('payment_id', paymentId);

      const totalTime = Date.now() - startTime;
      console.log('[A2U] ✅ CREATE+APPROVE SUCCESS in', totalTime, 'ms');

      return new Response(
        JSON.stringify({
          success: true,
          paymentId: paymentId,
          payment: paymentData,
          message: 'A2U payment created and approved. Awaiting blockchain transaction.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ============ ACTION: COMPLETE A2U PAYMENT ============
    if (action === 'complete') {
      const { paymentId, txid } = body;

      if (!paymentId) throw new Error('Payment ID is required');
      if (!txid) throw new Error('Transaction ID is required');

      console.log('[A2U] 🔄 Completing A2U payment:', paymentId, 'txid:', txid);

      const completeResponse = await fetch(`${PI_API_BASE_URL}/v2/payments/${paymentId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${PI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ txid }),
      });

      if (!completeResponse.ok) {
        const errorText = await completeResponse.text();
        console.error('[A2U] ❌ Pi API complete failed:', completeResponse.status, errorText);
        throw new Error(`Pi API complete failed: ${errorText}`);
      }

      const completionResult = await completeResponse.json();
      console.log('[A2U] ✅ A2U payment completed:', JSON.stringify(completionResult));

      await supabase.from('payment_idempotency').update({
        status: 'a2u_completed',
        txid: txid,
      }).eq('payment_id', paymentId);

      return new Response(
        JSON.stringify({
          success: true,
          payment: completionResult,
          message: 'A2U payment completed successfully',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ============ ACTION: GET PAYMENT STATUS ============
    if (action === 'status') {
      const { paymentId } = body;

      if (!paymentId) throw new Error('Payment ID is required');

      console.log('[A2U] 📡 Checking payment status:', paymentId);

      const statusResponse = await fetch(`${PI_API_BASE_URL}/v2/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${PI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        throw new Error(`Failed to get payment status: ${errorText}`);
      }

      const statusData = await statusResponse.json();
      console.log('[A2U] ✅ Payment status:', JSON.stringify(statusData));

      return new Response(
        JSON.stringify({ success: true, payment: statusData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ============ ACTION: LIST A2U PAYMENTS (default) ============
    if (action === 'list') {
      console.log('[A2U] 📋 Listing A2U payments');

      const { data: payments, error } = await supabase
        .from('payment_idempotency')
        .select('*')
        .like('status', 'a2u_%')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[A2U] ❌ List query error:', error);
        throw new Error('Failed to list payments');
      }

      return new Response(
        JSON.stringify({ success: true, payments: payments || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    const totalTime = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[A2U] ❌ FAILED in', totalTime, 'ms:', errorMsg);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
