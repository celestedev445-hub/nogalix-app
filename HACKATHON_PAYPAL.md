# PayPal AI Hackathon — Nogalix

## What changed
- Added PayPal Orders API v2 (sandbox/live) next to MeSomb Mobile Money and KeyPay card.
- Method `PAYPAL` creates a PayPal order; the frontend Smart Buttons capture it via `/payments/{reference}/paypal/capture`.
- MeSomb and KeyPay paths are unchanged when PayPal env vars are empty (`paypal_enabled` stays false).

## Env (sandbox)
```
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox
PAYPAL_CURRENCY=USD
PAYPAL_XAF_PER_USD=600
```
Create a Sandbox app: https://developer.paypal.com/dashboard/applications/sandbox

## Notes
- Plan prices stay in XAF in DB; PayPal charges a converted USD amount (indicative rate).
- Do not enable on production until sandbox keys are verified and live keys + currency policy are reviewed.
