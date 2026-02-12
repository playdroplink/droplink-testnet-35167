# Copy/Paste Env Setup (Pi Testnet)

Use this file as a ready-to-paste template.

## 1) Frontend `.env.local`

```env
# ===== Pi Frontend =====
VITE_PI_APP_ID=your_testnet_pi_app_id
VITE_PI_SANDBOX_MODE=true
VITE_PI_USE_BACKEND=true
VITE_PI_PAYMENT_RECEIVER_WALLET=GYOUR_TESTNET_RECEIVER_WALLET

# Optional (frontend-visible, only if your flow needs it)
VITE_PI_API_KEY=
VITE_PI_VALIDATION_KEY=

# ===== Supabase Frontend =====
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 2) Supabase Edge Function secrets (server-side)

Copy/paste in terminal:

```bash
supabase secrets set PI_API_KEY=your_server_pi_api_key
supabase secrets set PI_VALIDATION_KEY=your_server_pi_validation_key
supabase secrets set PI_SANDBOX_MODE=true
supabase secrets set SUPABASE_URL=your_supabase_project_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## 3) Deploy functions used by Pi flows

```bash
supabase functions deploy pi-payment-approve --no-verify-jwt
supabase functions deploy pi-payment-complete --no-verify-jwt
supabase functions deploy a2u-payment --no-verify-jwt
```

## 4) Verify locally

```bash
npm run build
```

## 5) Important

- A2U requires recipient **Pi UID**, not username/wallet address.
- Keep API keys and wallet private seed server-side only.
- Do not commit real secrets to git.
