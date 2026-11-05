# Nogalix — AI CV generator with PayPal Checkout

**Live demo:** https://nogalix.avexsolution.com  
**PayPal AI Hackathon 2026** — PayPal Orders API v2 (sandbox) + Gemini AI

## What it is
Nogalix turns a CV / job offer into a tailored CV and cover letter with Gemini.
During this hackathon we added **PayPal sandbox Checkout** next to the existing
Mobile Money (MeSomb) and card (KeyPay) flows — without removing them.

## Significant update during the Submission Period (from 1 Oct 2026)
- New `backend/app/modules/payments/paypal.py` (OAuth + Orders create/capture)
- Checkout method `PAYPAL` + capture endpoint
- Frontend Smart Buttons (`PayPalCheckout.tsx`) in the plans checkout sheet
- Env: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE=sandbox`

AI (Gemini) generates CVs; PayPal collects subscription payment in sandbox USD
(converted from plan prices kept in XAF).

## Built with
- PayPal Orders API v2 (sandbox)
- Google Gemini
- FastAPI + React/Vite
- MeSomb / KeyPay (unchanged fallbacks)

## Run locally
1. Copy `backend/.env.example` → `backend/.env` and fill secrets (never commit `.env`).
2. MySQL + Python 3.11+ / Node 20+.
3. From repo root: `start.bat` (serves site + API on http://localhost:8010).
4. Create an account, open Plans, choose **PayPal**, complete sandbox payment.

Sandbox buyer accounts: https://developer.paypal.com/dashboard/accounts

## License
MIT — see [LICENSE](./LICENSE).
