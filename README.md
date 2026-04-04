# SubNest

SubNest is a full-stack subscription and invoice management platform with:
- a customer portal (shop, cart, checkout, orders, invoices, payments)
- an internal dashboard (operations, approvals, billing, reporting)
- Stripe-powered payment sessions and webhook-based settlement

This README is the primary project documentation for the whole repository (outside frontend and backend folders).

## What This Project Includes

### Customer Portal
- Login and signup flow with JWT authentication
- Protected portal routes (user must be authenticated)
- Product catalog browsing and product detail pages
- Cart and checkout flow
- Order creation linked with subscription and invoice records
- My Orders and My Invoices pages
- Stripe checkout for invoice payment
- Payment success/cancel handling
- Logout from portal header

### Operations Dashboard
- Management modules for contacts, products, plans, taxes, discounts
- Subscription and invoice workflows
- Approval workflow endpoints
- Reporting page with:
  - summary metrics
  - revenue trend
  - subscription status stats

### Backend Platform Capabilities
- Express API with modular routes/controllers
- PostgreSQL schema bootstrap on startup
- Role-based route protection (`admin`, `internal`, `user`)
- Ownership checks for customer data access
- Stripe webhook processing for payment settlement

## Tech Stack

### Frontend
- Next.js 16 (App Router)
- React 19
- Zustand (auth and cart state)
- Tailwind CSS 4
- Lucide React icons

### Backend
- Node.js + Express 5
- PostgreSQL (`pg`)
- JWT authentication (`jsonwebtoken`)
- Password hashing (`bcrypt`)
- Nodemailer (password reset email flow)
- Stripe SDK

## Repository Structure

```text
SubNest/
  backend/
    controllers/        # API handlers (auth, billing, portal, reporting, etc.)
    middlewares/        # auth, errors, logging, permission checks
    models/             # db connection + schema bootstrap
    routes/             # route modules by domain
    scripts/            # database creation/bootstrap helper scripts
    utils/              # API helpers, email service, portal catalog, pricing helpers
    docs/               # backend-specific docs (e.g. Stripe testing)
    server.js           # API entrypoint
  frontend/
    app/                # Next.js app routes (auth, dashboard, portal, payments)
    components/         # reusable UI/layout/portal components
    lib/                # API client and helper data utilities
    store/              # Zustand stores
    public/             # static assets
```

## Roles and Access (High Level)

### `user`
- Can use customer portal routes
- Can view own orders/invoices/profile
- Can create payment sessions for own invoices
- Can renew own subscription

### `internal`
- Can access dashboard operational modules
- Can access reporting endpoints
- Can perform internal workflow actions except admin-only actions

### `admin`
- Full dashboard access
- User management access
- Approval review actions
- Reporting access

## Core API Surface (Summary)

Base URL: `http://localhost:5000/api`

### Auth
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/me`

### Portal + Orders
- `GET /portal/products`
- `POST /orders`
- `GET /my/orders`
- `GET /my/orders/:id`
- `GET /my/invoices`

### Payments
- `POST /payments/create-session`
- `GET /payments/session/:id`
- `POST /payments/session/:id/complete`
- `POST /payments/session/:id/fail`
- `POST /payments/webhook` (Stripe webhook endpoint)

### Reports
- `GET /reports/summary`
- `GET /reports/revenue-trend`
- `GET /reports/subscription-stats`

## Environment Variables

## Backend (`backend/.env`)
Use `backend/.env.example` as reference.

Required/common variables:
- `DB_URL`
- `DB_SSL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `EMAIL_USER`
- `EMAIL_PASS`
- `PORT`
- `FRONTEND_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CURRENCY`

## Frontend (`frontend/.env.local`)
Recommended:
- `NEXT_PUBLIC_API_URL=http://localhost:5000/api`

## Local Setup

### 1) Clone and install

```bash
# backend
cd backend
npm install

# frontend
cd ../frontend
npm install
```

### 2) Configure environment
- Create `backend/.env` from `backend/.env.example`
- Create `frontend/.env.local` and set `NEXT_PUBLIC_API_URL`

### 3) Database setup

```bash
cd backend
npm run db:setup
```

### 4) Run backend

```bash
cd backend
npm run dev
# or
npm run start
```

### 5) Run frontend

```bash
cd frontend
npm run dev
```

Frontend: `http://localhost:3000`
Backend health check: `http://localhost:5000/api/health`

## Payment Testing

Stripe testing checklist is available in:
- `backend/docs/payment-testing.md`

Typical flow:
1. Start backend and frontend
2. Run Stripe CLI webhook forwarding
3. Create invoice and start payment session
4. Complete checkout with Stripe test card

## Scripts

### Backend (`backend/package.json`)
- `npm run start` - start API server
- `npm run dev` - start API server with nodemon
- `npm run db:setup` - create DB if missing

### Frontend (`frontend/package.json`)
- `npm run dev` - Next dev server
- `npm run build` - production build
- `npm run start` - run production build
- `npm run lint` - lint code

## Notes

- Portal pages are intended to be auth-protected.
- Stripe webhooks require correct signing secret.
- If `stripe` CLI is not available, install Stripe CLI before webhook tests.
- Some older dashboard files may still contain lint warnings; validate module-by-module when doing broad lint cleanup.

## Contribution Workflow

1. Create feature branch
2. Implement changes in backend/frontend as needed
3. Group commits by feature
4. Push and open PR
5. Validate API + UI flows before merge
