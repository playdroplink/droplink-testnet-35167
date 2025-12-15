import expressPkg from 'express';
const { Request, Response } = expressPkg;
const express = expressPkg;
import fetch from 'node-fetch';
import dotenv from 'dotenv';

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

app.post('/pi-payment-approve', async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    console.log('Approving Pi payment:', paymentId);


    // Use VITE_PI_API_KEY if present, else fallback to PI_API_KEY
    const piApiKey = process.env.VITE_PI_API_KEY || process.env.PI_API_KEY;
    if (!piApiKey) {
      console.error('PI_API_KEY or VITE_PI_API_KEY not configured (missing in environment)');
      return res.status(500).json({ error: 'Server configuration error: PI_API_KEY or VITE_PI_API_KEY missing' });
    } else {
      // Debug log for presence of PI_API_KEY (do not log the key value)
      console.log('PI_API_KEY (or VITE_PI_API_KEY) loaded from environment.');
    }

    console.log('Calling Pi API to approve payment...');

    const approveResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${piApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await approveResponse.text();
    console.log('Pi API response status:', approveResponse.status);
    console.log('Pi API response:', responseText);

    if (!approveResponse.ok) {
      console.error('Pi payment approval failed:', responseText);
      return res.status(400).json({ error: `Failed to approve payment: ${responseText}` });
    }

    let approvalData;
    try {
      approvalData = JSON.parse(responseText);
    } catch {
      approvalData = { status: 'approved', paymentId };
    }

    console.log('Payment approved successfully:', approvalData);
    return res.json({ success: true, payment: approvalData });
  } catch (error) {
    console.error('Error in pi-payment-approve:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(400).json({ error: errorMessage });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
