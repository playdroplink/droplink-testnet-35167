import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const secret = process.env.DROPPAY_WEBHOOK_SECRET;
    const sigHeader = (req.headers['x-droppay-signature'] || req.headers['X-Droppay-Signature']) as string | undefined;
    const payload = req.body;

    if (secret && sigHeader) {
      const h = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
      if (h !== sigHeader) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase environment variables missing' });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const status = payload?.status || payload?.payment?.status;
    const metadata = payload?.metadata || payload?.payment?.metadata || {};
    const profileId = metadata.profile_id || metadata.profileId;
    const plan = metadata.plan;
    const period = metadata.period || 'monthly';
    const amount = payload?.amount || payload?.payment?.amount || 0;
    const paymentId = payload?.id || payload?.payment?.id;
    const txid = payload?.txid || payload?.transaction_id || paymentId;

    // Grant subscription on completion
    if (status === 'completed' && profileId && plan) {
      const now = new Date();
      const expiresAt = new Date(now);
      if (period === 'yearly') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }

      const { error: updErr } = await supabase
        .from('profiles')
        .update({
          subscription_plan: plan,
          subscription_expires_at: expiresAt.toISOString(),
          subscription_period: period,
          has_premium: plan !== 'free',
        })
        .eq('id', profileId);
      if (updErr) {
        return res.status(500).json({ error: updErr.message || updErr });
      }
      await supabase
        .from('subscription_transactions')
        .insert({
          profile_id: profileId,
          plan,
          period,
          pi_amount: amount || 0,
          payment_id: paymentId,
          txid,
          expires_at: expiresAt.toISOString(),
        });
    }

    // Record product purchase if present
    const productId = metadata.product_id || metadata.productId;
    if (status === 'completed' && profileId && productId) {
      await supabase
        .from('payment_transactions')
        .insert({
          profile_id: profileId,
          transaction_id: txid || `dp_${paymentId || Date.now()}`,
          payment_id: paymentId,
          amount: amount || 0,
          sender_address: payload?.sender || '',
          receiver_address: payload?.receiver || '',
          status: 'completed',
          memo: metadata.description || '',
          pi_metadata: metadata,
          confirmed_at: new Date().toISOString(),
        });
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || 'Unknown error';
    return res.status(400).json({ error: msg });
  }
}
