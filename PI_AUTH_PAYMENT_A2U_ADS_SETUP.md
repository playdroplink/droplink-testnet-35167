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

## 5) A2U with `pi-ruby` (recommended backend pattern)

If you want a dedicated backend service for A2U flows, follow the official Ruby SDK approach:
- Repo: https://github.com/pi-apps/pi-ruby

### Step A: Install SDK in your backend

```ruby
# Gemfile
gem 'pinetwork'
```

```bash
bundle install
```

### Step B: Configure secrets (server-side only)

Set these in your backend environment (never client-side):

```bash
PI_API_KEY=your_server_pi_api_key
PI_WALLET_PRIVATE_SEED=your_server_wallet_seed_starts_with_S
PI_SANDBOX_MODE=true
```

### Step C: Initialize Pi SDK in Ruby

```ruby
require 'pinetwork'

pi = PiNetwork.new(
  api_key: ENV.fetch('PI_API_KEY'),
  wallet_private_seed: ENV.fetch('PI_WALLET_PRIVATE_SEED'),
  sandbox: ENV.fetch('PI_SANDBOX_MODE', 'false') == 'true'
)
```

### Step D: A2U create / approve / complete flow

Backend flow should be:
1. Create A2U payment (`app_to_user`) for recipient UID.
2. Approve payment server-side.
3. Complete payment when txid is returned.
4. Persist idempotency state in your DB (`created`, `approved`, `completed`).

Suggested endpoint contract (compatible with this repo page):
- `POST /a2u/create` => `{ recipientUid, amount, memo, metadata }`
- `POST /a2u/complete` => `{ paymentId, txid }`
- `GET /a2u/status/:paymentId`

### Step E: Connect frontend to your backend

In this repository, frontend currently calls Supabase edge function `a2u-payment`.
If you migrate to a Ruby backend, keep the same payload/response shape so `src/pages/A2UPayment.tsx` can continue working with minimal changes.

### Pi Ad Network
- Ensure Pi SDK Ads API availability (`Pi.Ads`).
- Gate rewards on verified ad result only.


## 7) A2U identifier rules (important)

For A2U, your server must send the recipient **Pi UID** (the `uid` field), not username and not wallet address.

- ✅ Supported for A2U create: `recipientUid` (Pi user UID)
- ❌ Not supported directly in current flow: Pi username
- ❌ Not supported directly in current flow: Pi wallet address

Why:
- In this repository, the A2U edge function sends `uid: recipientUid` to Pi `/v2/payments` create call.
- The A2U page input is explicitly designed for recipient UID.

If you only have username/wallet, first map it to UID in your own backend/user table, then call A2U create with that UID.

## 8) Step-by-step tutorial (testnet, 10 wallets)

Use this exact sequence to reliably complete testnet A2U runs.

### Step 1: Configure server secrets (Supabase)

```bash
supabase secrets set PI_API_KEY=***
supabase secrets set PI_VALIDATION_KEY=***
supabase secrets set PI_SANDBOX_MODE=true
```

### Step 2: Frontend env for local testnet

```env
VITE_PI_SANDBOX_MODE=true
VITE_PI_USE_BACKEND=true
VITE_PI_APP_ID=your-testnet-app-id
```

### Step 3: Deploy/serve edge function

```bash
supabase functions deploy a2u-payment --no-verify-jwt
# or local
supabase functions serve a2u-payment
```

### Step 4: Prepare 10 recipient UIDs

For each recipient wallet/user, collect their Pi UID (not username / not wallet address).
Store as:

- `uid_01`
- `uid_02`
- ...
- `uid_10`

### Step 5: Send A2U from A2U page

For each UID:
1. Open `/a2u-payment`
2. Enter `Recipient Pi UID`
3. Enter amount (e.g. `0.01` Pi for test)
4. Enter memo (example: `testnet batch #01`)
5. Click **Send Payment**

### Step 6: Verify status after each send

- Use page **History** + **Check Status**
- Expected lifecycle in your DB:
  - `a2u_created`
  - `a2u_approved`
  - (optionally) `a2u_completed` after completion step

### Step 7: Complete payment when txid available

Call complete action with paymentId + txid:

```json
{ "action": "complete", "paymentId": "...", "txid": "..." }
```

### Step 8: Batch checklist for 10 wallets

- [ ] 10/10 sends returned `success: true`
- [ ] 10/10 have `a2u_approved` (minimum)
- [ ] 10/10 have `a2u_completed` (if completion step executed)
- [ ] no API key exposure in client logs

### Step 9: Common failures

- `PI_API_KEY not configured` -> missing Supabase secret
- `Unknown action` -> wrong body payload
- `Failed to get payment status` -> wrong paymentId or network mismatch
- payments not found -> check `PI_SANDBOX_MODE` and app env consistency

## 9) References

- Pi SDK docs: https://pi-apps.github.io/community-developer-guide/docs/gettingStarted/piAppPlatform/piAppPlatformSDK/
- Pi payment docs: https://pi-apps.github.io/community-developer-guide/
- Pi platform docs: https://github.com/pi-apps/pi-platform-docs
- Ads docs: https://github.com/pi-apps/pi-platform-docs/blob/master/ads.md
- Pi Ruby SDK: https://github.com/pi-apps/pi-ruby


## 10) Quick copy/paste env file

For a ready-to-paste setup, use: `ENV_COPY_PASTE_TESTNET.md`.
