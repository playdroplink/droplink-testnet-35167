import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    // Read DropPay configuration from server-side env
    // Fallback to VITE_* variants if present to ease migration
    const baseUrl =
      process.env.DROPPAY_BASE_URL ||
      process.env.VITE_DROPPAY_BASE_URL ||
      'https://droppay-v2.lovable.app/api/v1';
    const apiKey = process.env.DROPPAY_API_KEY || process.env.VITE_DROPPAY_API_KEY;
    const authScheme = process.env.DROPPAY_AUTH_SCHEME || process.env.VITE_DROPPAY_AUTH_SCHEME || 'Key';

    if (!apiKey) {
      return res.status(500).json({
        error: 'Server configuration error: DROPPAY_API_KEY missing',
      });
    }

    const { amount, currency, description, metadata } = req.body || {};
    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    const r = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `${authScheme} ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount, currency: currency || 'PI', description, metadata }),
    });
    const text = await r.text();
    if (!r.ok) {
      return res.status(400).json({ error: `Droppay create failed: ${text}` });
    }
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { ok: true, raw: text };
    }
    // Normalize checkout URL for client
    const checkoutUrl =
      data?.checkout_url ||
      data?.url ||
      data?.payment_url ||
      data?.payment?.checkout_url ||
      data?.links?.checkout ||
      data?.redirect_url ||
      undefined;

    // Ensure the payment object contains a standard field
    const payment = { ...data };
    if (checkoutUrl && !payment.checkout_url) {
      payment.checkout_url = checkoutUrl;
    }

    return res.status(200).json({ success: true, payment });
  } catch (e: any) {
    const msg = e?.message || 'Unknown error';
    return res.status(400).json({ error: msg });
  }
}
