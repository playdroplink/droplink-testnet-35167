// Pi Payment Approve Edge Function
// Phase I of User-to-App payment: Developer approves the payment
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
    const { paymentId, metadata } = await req.json();
    if (!paymentId) throw new Error("Payment ID is required");

    console.log('[APPROVE] Approving payment:', paymentId);

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

    if (existing && (existing.status === 'completed' || existing.status === 'approved')) {
      return new Response(
        JSON.stringify({ success: true, message: 'Payment already processed', payment: { id: paymentId, status: existing.status } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get payment from Pi API
    const getRes = await fetch(`${PI_API_BASE_URL}/v2/payments/${paymentId}`, {
      headers: { 'Authorization': `Key ${PI_API_KEY}` },
    });
    if (!getRes.ok) {
      const err = await getRes.text();
      throw new Error(`Failed to fetch payment: ${err}`);
    }
    const paymentDetails = await getRes.json();

    // Resolve profile
    let profileId = metadata?.profileId || null;
    if (!profileId && metadata?.username) {
      const { data: p } = await supabase.from('profiles').select('id').eq('username', metadata.username).maybeSingle();
      if (p) profileId = p.id;
    }

    // Record for idempotency
    await supabase.from('payment_idempotency').upsert({
      payment_id: paymentId,
      profile_id: profileId,
      status: 'pending',
      metadata: { ...paymentDetails.metadata, ...metadata, amount: paymentDetails.amount },
    }, { onConflict: 'payment_id' });

    // Approve via Pi API
    const approveRes = await fetch(`${PI_API_BASE_URL}/v2/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Key ${PI_API_KEY}`, 'Content-Type': 'application/json' },
    });
    if (!approveRes.ok) {
      const err = await approveRes.text();
      await supabase.from('payment_idempotency').update({ status: 'failed' }).eq('payment_id', paymentId);
      throw new Error(`Approval failed: ${err}`);
    }
    const approvalResult = await approveRes.json();

    await supabase.from('payment_idempotency').update({
      status: 'approved',
      metadata: { ...paymentDetails.metadata, ...metadata, amount: paymentDetails.amount, approvedAt: new Date().toISOString() },
    }).eq('payment_id', paymentId);

    console.log('[APPROVE] ✅ Payment approved:', paymentId);
    return new Response(
      JSON.stringify({ success: true, payment: approvalResult, message: 'Payment approved' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[APPROVE] ❌', msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
