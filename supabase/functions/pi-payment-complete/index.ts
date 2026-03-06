// Pi Payment Complete Edge Function
// Phase III of User-to-App payment: Developer completes after blockchain tx
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

  try {
    const { paymentId, txid, metadata } = await req.json();
    if (!paymentId || !txid) throw new Error("Payment ID and transaction ID are required");

    console.log('[COMPLETE] Completing:', paymentId, 'txid:', txid);

    const PI_API_KEY = Deno.env.get('PI_API_KEY') || Deno.env.get('VITE_PI_API_KEY');
    if (!PI_API_KEY) throw new Error("PI_API_KEY not configured");

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) throw new Error('Supabase configuration missing');
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check idempotency
    const { data: existing } = await supabase
      .from('payment_idempotency')
      .select('*')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (existing?.status === 'completed') {
      return new Response(
        JSON.stringify({ success: true, message: 'Already completed', payment: { id: paymentId, txid: existing.txid } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const storedMetadata = existing?.metadata || {};
    const finalMetadata = { ...storedMetadata, ...metadata };

    // Complete via Pi API
    const completeRes = await fetch(`${PI_API_BASE_URL}/v2/payments/${paymentId}/complete`, {
      method: 'POST',
      headers: { 'Authorization': `Key ${PI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ txid }),
    });
    if (!completeRes.ok) {
      const err = await completeRes.text();
      throw new Error(`Completion failed: ${err}`);
    }
    const completionResult = await completeRes.json();

    // Update idempotency
    await supabase.from('payment_idempotency').upsert({
      payment_id: paymentId,
      profile_id: existing?.profile_id || finalMetadata.profileId,
      status: 'completed',
      txid,
      metadata: { ...finalMetadata, completedAt: new Date().toISOString() },
    }, { onConflict: 'payment_id' });

    // Handle subscription if applicable
    const planType = (finalMetadata.subscriptionPlan || '').toLowerCase();
    const billingPeriod = finalMetadata.billingPeriod || 'monthly';
    let profileId = existing?.profile_id || finalMetadata.profileId;

    if (!profileId && finalMetadata.username) {
      const { data: p } = await supabase.from('profiles').select('id').eq('username', finalMetadata.username).maybeSingle();
      if (p) profileId = p.id;
    }

    if (planType && profileId && planType !== 'free') {
      const endDate = new Date();
      if (billingPeriod === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);
      else endDate.setMonth(endDate.getMonth() + 1);

      await supabase.from('subscriptions').upsert({
        profile_id: profileId,
        plan_type: planType,
        billing_period: billingPeriod,
        pi_amount: completionResult.amount || 0,
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
        status: 'active',
        auto_renew: true,
      }, { onConflict: 'profile_id' });

      console.log('[COMPLETE] ✅ Subscription created for:', profileId, planType);
    }

    console.log('[COMPLETE] ✅ Payment completed:', paymentId);
    return new Response(
      JSON.stringify({ success: true, payment: completionResult, message: 'Payment completed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[COMPLETE] ❌', msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
