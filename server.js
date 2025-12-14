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

// /pi-payment-approve route
app.post('/pi-payment-approve', async (req, res) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }
    const piApiKey = process.env.PI_API_KEY;
    if (!piApiKey) {
      console.error('PI_API_KEY not configured (missing in environment)');
      return res.status(500).json({ error: 'Server configuration error: PI_API_KEY missing' });
    } else {
      console.log('PI_API_KEY loaded from environment.');
    }
    const approveResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${piApiKey}`,
        'Content-Type': 'application/json',
      },
    });
    const responseText = await approveResponse.text();
    if (!approveResponse.ok) {
      return res.status(400).json({ error: `Failed to approve payment: ${responseText}` });
    }
    let approvalData;
    try {
      approvalData = JSON.parse(responseText);
    } catch {
      approvalData = { status: 'approved', paymentId };
    }
    return res.json({ success: true, payment: approvalData });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(400).json({ error: errorMessage });
  }
});

// /pi-payment-complete route
app.post('/pi-payment-complete', async (req, res) => {
  try {
    const { paymentId, txid } = req.body;
    if (!paymentId || !txid) {
      return res.status(400).json({ error: 'Payment ID and transaction ID are required' });
    }
    const piApiKey = process.env.PI_API_KEY;
    if (!piApiKey) {
      console.error('PI_API_KEY not configured (missing in environment)');
      return res.status(500).json({ error: 'Server configuration error: PI_API_KEY missing' });
    } else {
      console.log('PI_API_KEY loaded from environment.');
    }
    const completeResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${piApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ txid }),
    });
    const responseText = await completeResponse.text();
    if (!completeResponse.ok) {
      return res.status(400).json({ error: `Failed to complete payment: ${responseText}` });
    }
    let paymentData;
    try {
      paymentData = JSON.parse(responseText);
    } catch {
      paymentData = { status: 'completed', paymentId, txid };
    }
    // Update user's subscription status in database
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase environment variables missing' });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    // ... (rest of your Supabase logic here)
    return res.json({ success: true, payment: paymentData });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(400).json({ error: errorMessage });
  }
});

// /pi-auth route
app.post('/pi-auth', async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token is required' });
    }
    const piApiKey = process.env.PI_API_KEY;
    if (!piApiKey) {
      return res.status(500).json({ error: 'Server configuration error: PI_API_KEY missing' });
    }
    const verifyResponse = await fetch('https://api.minepi.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      return res.status(400).json({ error: `Pi verification failed: ${verifyResponse.status}` });
    }
    const piUser = await verifyResponse.json();
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Supabase environment variables missing' });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // ... (rest of your Supabase logic here)
    return res.json({ success: true, user: piUser });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(400).json({ error: errorMessage });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
