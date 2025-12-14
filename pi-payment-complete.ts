import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.post('/pi-payment-complete', async (req: Request, res: Response) => {
  try {
    const { paymentId, txid } = req.body;
    if (!paymentId || !txid) {
      return res.status(400).json({ error: 'Payment ID and transaction ID are required' });
    }

    console.log('Completing Pi payment:', paymentId, 'txid:', txid);

    const piApiKey = process.env.PI_API_KEY;
    if (!piApiKey) {
      console.error('PI_API_KEY not configured (missing in environment)');
      return res.status(500).json({ error: 'Server configuration error: PI_API_KEY missing' });
    } else {
      // Debug log for presence of PI_API_KEY (do not log the key value)
      console.log('PI_API_KEY loaded from environment.');
    }

    console.log('Calling Pi API to complete payment...');

    const completeResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${piApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ txid }),
    });

    const responseText = await completeResponse.text();
    console.log('Pi API response status:', completeResponse.status);
    console.log('Pi API response:', responseText);

    if (!completeResponse.ok) {
      console.error('Pi payment completion failed:', responseText);
      return res.status(400).json({ error: `Failed to complete payment: ${responseText}` });
    }

    let paymentData: any;
    try {
      paymentData = JSON.parse(responseText);
    } catch {
      paymentData = { status: 'completed', paymentId, txid };
    }

    console.log('Payment completed successfully:', paymentData);

    // Update user's subscription status in database
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase environment variables missing' });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get subscription details from payment metadata
    const profileId = paymentData.metadata?.profile_id || paymentData.metadata?.profileId;
    const plan = paymentData.metadata?.plan;
    const period = paymentData.metadata?.period;
    const piAmount = paymentData.amount;

    console.log('Subscription metadata:', { profileId, plan, period, piAmount });

    if (profileId && plan) {
      // Calculate expiration date
      const now = new Date();
      const expiresAt = new Date(now);
      if (period === 'yearly') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }

      console.log('Updating profile subscription:', profileId, 'to', plan, 'expires:', expiresAt.toISOString());

      // Update profile subscription
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          subscription_plan: plan,
          subscription_expires_at: expiresAt.toISOString(),
          subscription_period: period || 'monthly',
          has_premium: plan !== 'free',
        })
        .eq('id', profileId);

      if (updateError) {
        console.error('Failed to update profile:', updateError);
        return res.status(500).json({ error: updateError.message || updateError });
      }

      console.log('Profile updated successfully');

      // Record the transaction
      const { error: txError } = await supabase
        .from('subscription_transactions')
        .insert({
          profile_id: profileId,
          plan,
          period: period || 'monthly',
          pi_amount: piAmount || 0,
          pi_payment_id: paymentId,
          pi_txid: txid,
          expires_at: expiresAt.toISOString(),
        });

      if (txError) {
        console.error('Failed to record transaction:', txError);
        // Don't throw - subscription update was successful
      } else {
        console.log('Transaction recorded successfully');
      }

      console.log(`Updated profile ${profileId} to ${plan} (${period}) until ${expiresAt.toISOString()}`);
    } else {
      console.warn('Missing subscription metadata, skipping profile update');
    }

    return res.json({ success: true, payment: paymentData });
  } catch (error) {
    console.error('Error in pi-payment-complete:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(400).json({ error: errorMessage });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
