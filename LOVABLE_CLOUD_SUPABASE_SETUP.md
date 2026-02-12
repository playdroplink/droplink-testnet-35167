# Lovable Cloud Supabase Setup (Pi Auth + Pi Payment + A2U)

This is the exact setup to run everything on **Lovable Cloud Supabase** (not another Supabase project).

## 1) Link CLI to Lovable Cloud project

```bash
supabase login
supabase link --project-ref <LOVABLE_PROJECT_REF>
```

Verify:

```bash
supabase projects list
supabase status
```

## 2) Set frontend env to Lovable Cloud

Put in `.env.local`:

```env
VITE_SUPABASE_URL=https://<LOVABLE_PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<LOVABLE_ANON_KEY>

# Force A2U page to Lovable Cloud functions endpoint
VITE_SUPABASE_FUNCTIONS_URL=https://<LOVABLE_PROJECT_REF>.supabase.co/functions/v1

# Pi frontend flags
VITE_PI_APP_ID=<YOUR_PI_APP_ID>
VITE_PI_SANDBOX_MODE=true
VITE_PI_USE_BACKEND=true
VITE_PI_PAYMENT_RECEIVER_WALLET=<YOUR_APP_WALLET_G_ADDRESS>
```

## 3) Set Lovable Cloud edge function secrets

```bash
supabase secrets set PI_API_KEY=<SERVER_PI_API_KEY>
supabase secrets set PI_VALIDATION_KEY=<SERVER_PI_VALIDATION_KEY>
supabase secrets set PI_SANDBOX_MODE=true
supabase secrets set SUPABASE_URL=https://<LOVABLE_PROJECT_REF>.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<LOVABLE_SERVICE_ROLE_KEY>
```

## 4) Apply database migrations on Lovable Cloud

```bash
supabase db push
```

This ensures tables used by Pi flows (including `payment_idempotency`) exist.

## 5) Deploy Pi edge functions to Lovable Cloud

```bash
supabase functions deploy pi-auth --no-verify-jwt
supabase functions deploy pi-payment-approve --no-verify-jwt
supabase functions deploy pi-payment-complete --no-verify-jwt
supabase functions deploy a2u-payment --no-verify-jwt
supabase functions deploy pi-ad-verify --no-verify-jwt
```

## 6) Smoke test function endpoint (non-2xx check)

```bash
curl -i -X POST "https://<LOVABLE_PROJECT_REF>.supabase.co/functions/v1/a2u-payment" \
  -H "Content-Type: application/json" \
  -H "apikey: <LOVABLE_ANON_KEY>" \
  -H "Authorization: Bearer <LOVABLE_ANON_KEY>" \
  -d '{"action":"list"}'
```

Expected: HTTP 200 + JSON with `{ "success": true }`.

## 7) A2U recipient format

A2U create must use recipient **Pi UID** (`uid`), not username/wallet address.

## 8) If you still get non-2xx

1. Confirm frontend is using Lovable endpoint (`VITE_SUPABASE_FUNCTIONS_URL`).
2. Confirm function deployed in Lovable project (`supabase functions list`).
3. Confirm `verify_jwt=false` for `a2u-payment` in `supabase/config.toml`.
4. Confirm Pi secrets are present in Lovable project (`supabase secrets list`).
5. Confirm `PI_SANDBOX_MODE` matches your app/testnet mode.
