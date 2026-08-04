# AMANO — Business Intelligence Solutions

**One Platform. Every Operation. Intelligent Growth.**

AMANO gives African businesses visibility. This MVP answers five questions for a business owner:

- What am I selling?
- How much stock do I have?
- What is selling best?
- Who are my customers?
- How is my business performing?

## MVP Modules

| Module | What it does |
| --- | --- |
| **User Management** | Email/password registration, login, password reset, profiles, roles (Business Owner / Staff Member) |
| **Business Management** | Business registration, profile, settings, locations, staff join codes |
| **Product Management** | Products & services, categories, cost/selling prices, images, SKU |
| **Inventory Management** | Add/remove stock, adjustments after stock counts, movement history, low stock alerts |
| **Sales Management** | Fast sale recording with line items, customer & payment method, sale history |
| **BI Dashboard** | Revenue, profit, sales counts, best sellers, top customers, inventory value, revenue trend charts, reports with CSV export |

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Tailwind CSS + shadcn/ui + Recharts
- **Backend:** Supabase (Postgres, Auth, Storage, RLS)
- **Data fetching:** TanStack Query

## Getting Started

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com), then apply the schema:

- **Option A (SQL editor):** open the Supabase SQL editor and run the contents of
  `supabase/migrations/20260804000000_amano_mvp_schema.sql`.
- **Option B (CLI):** `supabase link --project-ref YOUR_PROJECT_ID && supabase db push`

The migration creates all tables, row-level security policies, the `record_sale` transaction
function, dashboard metric functions, and a public `product-images` storage bucket.

> Tip: in Supabase **Authentication → Providers → Email**, disable "Confirm email" during
> development so you can sign in immediately after registering.

### 2. Configure environment

```sh
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
# (Supabase dashboard → Project Settings → API)
```

### 3. Run

```sh
bun install    # or npm install
bun dev        # or npm run dev
```

## How roles work

- Registering and creating a business makes you its **Business Owner**.
- Owners find a **join code** under Settings → Team. Staff register their own account,
  choose **Join as Staff**, and enter the code.
- Owners manage the business profile, locations, team roles; staff can sell and manage
  stock, products, and customers.

## Project structure

```
supabase/migrations/   Database schema (tables, RLS, functions)
src/pages/             One file per screen
src/components/layout/ Sidebar shell + route guards
src/components/shared/ Logo, stat cards, empty states
src/contexts/          Business context (current business + role)
src/hooks/useAuth.tsx  Auth session + profile
src/integrations/      Supabase client + generated types
```
