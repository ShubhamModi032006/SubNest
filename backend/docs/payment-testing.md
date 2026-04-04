# Stripe Payment Testing Checklist

## Prerequisites

1. Set env values in backend `.env`:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `FRONTEND_URL`
2. Start backend:
   - `npm run start`
3. Use Stripe CLI in test mode:
   - `stripe login`
   - `stripe listen --forward-to localhost:5000/api/payments/webhook`

The `stripe listen` command prints a webhook signing secret. Copy it to `STRIPE_WEBHOOK_SECRET` in `.env`.

## Test 1: Successful Payment

1. Create and confirm an invoice from dashboard.
2. Trigger payment flow to call `POST /api/payments/create-session`.
3. Complete Stripe Checkout with test card:
   - Card number: `4242 4242 4242 4242`
   - Any future expiry, any CVC, any ZIP
4. Verify:
   - Webhook `checkout.session.completed` received
   - `payments.status` becomes `success`
   - `invoices.status` becomes `paid`
   - `invoices.paid_at` is set

## Test 2: Cancelled Payment

1. Start checkout and click cancel on Stripe page.
2. Verify frontend lands on `/payment/cancel`.
3. Verify:
   - No invoice status change to `paid`
   - Payment row remains `pending` unless session expires

## Test 3: Webhook Execution

1. Trigger webhook manually with Stripe CLI:
   - `stripe trigger checkout.session.completed`
2. Verify API response is 200 and webhook is accepted.
3. Verify signature validation by sending without signature and expecting 400.

## Test 4: Duplicate Payment Protection

1. Try creating session twice for same confirmed invoice.
2. Verify second call is rejected with conflict and duplicate payment is prevented.
