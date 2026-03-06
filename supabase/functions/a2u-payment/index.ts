// A2U (App-to-User) Payment Edge Function
// Full flow: Create → Submit (Stellar blockchain) → Complete
// Based on pi-backend SDK: https://github.com/pi-apps/pi-nodejs
// Docs: https://pi-apps.github.io/community-developer-guide/

declare const Deno: any;
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as StellarSdk from "https://esm.sh/stellar-sdk@11.3.0";

const PI_SANDBOX_MODE = (Deno.env.get('PI_SANDBOX_MODE') || 'false') === 'true';
const PI_API_BASE_URL = PI_SANDBOX_MODE ? "https://api.testnet.minepi.com" : "https://api.minepi.com";
const PI_HORIZON_URL = PI_SANDBOX_MODE ? "https://api.testnet.minepi.com" : "https://api.minepi.com";
const PI_NETWORK_PASSPHRASE = PI_SANDBOX_MODE ? "Pi Testnet" : "Pi Network";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper: Pi API request
async function piApiRequest(path: string, method: string, apiKey: string, body?: any) {
  const opts: any = {
    method,
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${PI_API_BASE_URL}${path}`, opts);
  const text = await res.text();

  if (!res.ok) {
    console.error(`[A2U] Pi API ${method} ${path} failed:`, res.status, text);
    throw new Error(`Pi API error (${res.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

// Build and submit Stellar transaction for A2U payment
async function submitPaymentToBlockchain(
  paymentId: string,
  apiKey: string,
  walletPrivateSeed: string
): Promise<string> {
  // 1. Get payment details from Pi API
  const payment = await piApiRequest(`/v2/payments/${paymentId}`, 'GET', apiKey);
  console.log('[A2U] Payment for submission:', JSON.stringify(payment));

  const amount = payment.amount;
  const toAddress = payment.to_address;
  const fromAddress = payment.from_address;

  if (!toAddress || !fromAddress) {
    throw new Error('Payment missing to_address or from_address');
  }

  // 2. Load the sender account from Horizon
  const server = new StellarSdk.Horizon.Server(PI_HORIZON_URL);
  const keypair = StellarSdk.Keypair.fromSecret(walletPrivateSeed);
  const sourceAccount = await server.loadAccount(keypair.publicKey());

  // 3. Build the transaction
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: await server.fetchBaseFee(),
    networkPassphrase: PI_NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: toAddress,
        asset: StellarSdk.Asset.native(),
        amount: amount.toString(),
      })
    )
    .addMemo(StellarSdk.Memo.text(paymentId.substring(0, 28)))
    .setTimeout(180)
    .build();

  // 4. Sign and submit
  transaction.sign(keypair);
  const result = await server.submitTransaction(transaction);
  const txid = result.hash;

  console.log('[A2U] ✅ Blockchain transaction submitted:', txid);
  return txid;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const PI_API_KEY = Deno.env.get('PI_API_KEY') || Deno.env.get('VITE_PI_API_KEY');
    if (!PI_API_KEY) throw new Error('PI_API_KEY not configured');

    const WALLET_SEED = Deno.env.get('WALLET_PRIVATE_SEED');
    if (!WALLET_SEED) throw new Error('WALLET_PRIVATE_SEED not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) throw new Error('Supabase configuration missing');
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const action = body.action || 'list';
    console.log('[A2U] Action:', action);

    // ============ CREATE: Full A2U flow (create → submit → complete) ============
    if (action === 'create') {
      const { amount, memo, metadata, recipientUid } = body;

      if (!amount || amount <= 0) throw new Error('Amount must be greater than 0');
      if (!recipientUid) throw new Error('Recipient UID is required');
      if (!memo) throw new Error('Memo is required');

      console.log('[A2U] 📤 Creating A2U payment:', { amount, memo, recipientUid });

      // Step 1: Create A2U payment via Pi API
      const paymentData = await piApiRequest('/v2/payments', 'POST', PI_API_KEY, {
        payment: {
          amount,
          memo,
          metadata: metadata || {},
          uid: recipientUid,
        }
      });

      const paymentId = paymentData.identifier || paymentData.id;
      console.log('[A2U] Payment created, id:', paymentId);

      // Record in DB
      await supabase.from('payment_idempotency').upsert({
        payment_id: paymentId,
        status: 'a2u_created',
        metadata: {
          ...(metadata || {}),
          direction: 'app_to_user',
          amount, memo, recipientUid,
          createdAt: new Date().toISOString(),
        }
      }, { onConflict: 'payment_id' });

      // Step 2: Submit to blockchain (this also auto-approves for A2U)
      console.log('[A2U] 🔗 Submitting to blockchain...');
      let txid: string;
      try {
        txid = await submitPaymentToBlockchain(paymentId, PI_API_KEY, WALLET_SEED);
      } catch (blockchainError: any) {
        console.error('[A2U] ❌ Blockchain submission failed:', blockchainError.message);
        // Update status
        await supabase.from('payment_idempotency').update({
          status: 'a2u_blockchain_failed',
          metadata: { direction: 'app_to_user', amount, memo, recipientUid, error: blockchainError.message }
        }).eq('payment_id', paymentId);
        throw new Error(`Blockchain submission failed: ${blockchainError.message}`);
      }

      // Update with txid
      await supabase.from('payment_idempotency').update({
        status: 'a2u_submitted',
        txid,
      }).eq('payment_id', paymentId);

      // Step 3: Complete the payment
      console.log('[A2U] ✅ Completing payment with txid:', txid);
      const completedPayment = await piApiRequest(`/v2/payments/${paymentId}/complete`, 'POST', PI_API_KEY, { txid });

      // Update final status
      await supabase.from('payment_idempotency').update({
        status: 'a2u_completed',
        txid,
        metadata: {
          ...(metadata || {}),
          direction: 'app_to_user',
          amount, memo, recipientUid,
          completedAt: new Date().toISOString(),
        }
      }).eq('payment_id', paymentId);

      const totalTime = Date.now() - startTime;
      console.log('[A2U] ✅ FULL A2U FLOW COMPLETE in', totalTime, 'ms');

      return new Response(
        JSON.stringify({
          success: true,
          paymentId,
          txid,
          payment: completedPayment,
          message: 'A2U payment created, submitted, and completed successfully.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ============ WITHDRAW: User-initiated withdrawal (A2U) ============
    if (action === 'withdraw') {
      const { amount, memo, recipientUid, profileId } = body;

      if (!amount || amount <= 0) throw new Error('Withdrawal amount must be greater than 0');
      if (!recipientUid) throw new Error('User UID is required for withdrawal');
      if (!profileId) throw new Error('Profile ID is required for withdrawal');

      console.log('[A2U] 💸 Processing withdrawal:', { amount, recipientUid, profileId });

      // Verify the profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, pi_wallet_address')
        .eq('id', profileId)
        .maybeSingle();

      if (!profile) throw new Error('Profile not found');

      const withdrawalMemo = memo || `Withdrawal for ${profile.username}`;

      // Create A2U payment for withdrawal
      const paymentData = await piApiRequest('/v2/payments', 'POST', PI_API_KEY, {
        payment: {
          amount,
          memo: withdrawalMemo,
          metadata: {
            type: 'withdrawal',
            profileId,
            username: profile.username,
          },
          uid: recipientUid,
        }
      });

      const paymentId = paymentData.identifier || paymentData.id;

      // Record
      await supabase.from('payment_idempotency').upsert({
        payment_id: paymentId,
        profile_id: profileId,
        status: 'withdrawal_created',
        metadata: {
          direction: 'app_to_user',
          type: 'withdrawal',
          amount,
          memo: withdrawalMemo,
          recipientUid,
          profileId,
          createdAt: new Date().toISOString(),
        }
      }, { onConflict: 'payment_id' });

      // Submit to blockchain
      let txid: string;
      try {
        txid = await submitPaymentToBlockchain(paymentId, PI_API_KEY, WALLET_SEED);
      } catch (blockchainError: any) {
        await supabase.from('payment_idempotency').update({
          status: 'withdrawal_failed',
        }).eq('payment_id', paymentId);
        throw new Error(`Withdrawal blockchain submission failed: ${blockchainError.message}`);
      }

      // Complete
      const completedPayment = await piApiRequest(`/v2/payments/${paymentId}/complete`, 'POST', PI_API_KEY, { txid });

      await supabase.from('payment_idempotency').update({
        status: 'withdrawal_completed',
        txid,
        metadata: {
          direction: 'app_to_user',
          type: 'withdrawal',
          amount,
          memo: withdrawalMemo,
          recipientUid,
          profileId,
          completedAt: new Date().toISOString(),
        }
      }).eq('payment_id', paymentId);

      return new Response(
        JSON.stringify({
          success: true,
          paymentId,
          txid,
          payment: completedPayment,
          message: `Successfully withdrew ${amount} Pi`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ============ STATUS ============
    if (action === 'status') {
      const { paymentId } = body;
      if (!paymentId) throw new Error('Payment ID is required');

      const statusData = await piApiRequest(`/v2/payments/${paymentId}`, 'GET', PI_API_KEY);
      return new Response(
        JSON.stringify({ success: true, payment: statusData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ============ INCOMPLETE: Get incomplete server payments ============
    if (action === 'incomplete') {
      const data = await piApiRequest('/v2/payments/incomplete_server_payments', 'GET', PI_API_KEY);
      return new Response(
        JSON.stringify({ success: true, payments: data.incomplete_server_payments || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ============ CANCEL ============
    if (action === 'cancel') {
      const { paymentId } = body;
      if (!paymentId) throw new Error('Payment ID is required');

      const cancelData = await piApiRequest(`/v2/payments/${paymentId}/cancel`, 'POST', PI_API_KEY);

      await supabase.from('payment_idempotency').update({
        status: 'a2u_cancelled',
      }).eq('payment_id', paymentId);

      return new Response(
        JSON.stringify({ success: true, payment: cancelData, message: 'Payment cancelled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ============ LIST (default) ============
    if (action === 'list') {
      const { data: payments, error } = await supabase
        .from('payment_idempotency')
        .select('*')
        .or('status.like.a2u_%,status.like.withdrawal_%')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw new Error('Failed to list payments');

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
      JSON.stringify({ success: false, error: errorMsg, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
