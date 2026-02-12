# Pi Auth + Payment + A2U + Ad Network Setup (Secure)

This project supports Pi authentication, user-to-app payments, app-to-user (A2U) payments, and Ad Network workflows.

## 1) Security first (important)

- Never hardcode API keys or wallet private seeds in frontend code.
- Keep `PI_API_KEY`, `PI_VALIDATION_KEY`, and wallet private seed only in server-side secrets.
- Frontend should only use public Vite env vars when strictly needed.

## 2) Required secrets (Supabase Edge Functions)

Set these in Supabase project secrets:

- `PI_API_KEY`
- `PI_VALIDATION_KEY`
- `PI_SANDBOX_MODE` (`true` for testnet, `false` for mainnet)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If you run A2U with a server wallet implementation, also set wallet seed server-side only (never in frontend).

Example:

```bash
supabase secrets set PI_API_KEY=***
supabase secrets set PI_VALIDATION_KEY=***
supabase secrets set PI_SANDBOX_MODE=true
```

## 3) Frontend env (local dev)

Use `.env.local`:

```env
VITE_PI_APP_ID=your-pi-app-id
VITE_PI_SANDBOX_MODE=true
VITE_PI_USE_BACKEND=true
VITE_PI_PAYMENT_RECEIVER_WALLET=G...
```

Notes:
- `VITE_PI_USE_BACKEND=true` is recommended for full 3-phase payment + A2U reliability.
- Set `VITE_PI_USE_BACKEND=false` only for debugging frontend callbacks.

## 4) Workflow checklist

### Pi Auth
- Open app in Pi Browser.
- `Pi.authenticate(['username','payments','wallet_address'])` should return access token + user.

### Pi Payment (U2A, 3-phase)
1. Frontend creates payment via `Pi.createPayment`.
2. `onReadyForServerApproval` -> Edge function `pi-payment-approve`.
3. `onReadyForServerCompletion` -> Edge function `pi-payment-complete`.

### A2U Payment
- Use edge function `a2u-payment` (`create`, `complete`, `status`, `list`).
- A2U must be backend-driven with secure server key handling.

### Pi Ad Network
- Ensure Pi SDK Ads API availability (`Pi.Ads`).
- Gate rewards on verified ad result only.

## 5) References

- Pi SDK docs: https://pi-apps.github.io/community-developer-guide/docs/gettingStarted/piAppPlatform/piAppPlatformSDK/
- Pi payment docs: https://pi-apps.github.io/community-developer-guide/
- Pi platform docs: https://github.com/pi-apps/pi-platform-docs
- Ads docs: https://github.com/pi-apps/pi-platform-docs/blob/master/ads.md
