# Landmark Track — Property & Rental Management Platform

A full-featured, SaaS-grade property and rental management platform for landlords, property managers, and real estate agencies. Built with Next.js 14, TypeScript, and Supabase.

**Live demo:** [landmark-track.vercel.app](https://landmark-track.vercel.app)

## Features

### Executive Dashboard
- **KPI cards** — Properties, units, occupancy, vacancies, damaged units, active tenants, monthly revenue, outstanding balances
- **Occupancy & collection rate** progress bars
- **Rent collection summary** — paid / due / overdue breakdown
- **Expiring leases widget** — leases ending within 30 days
- **Recent activity feed** — latest payments and maintenance requests

### Portfolio Management
- **Properties** — CRUD for buildings/complexes with address, type, and images
- **Units** — Individual rental units with rent amount, occupancy status (vacant/occupied), and condition status (good/damaged/uninhabitable)
- **Tenants** — Full profiles: name, ID/passport, phone, email, emergency contact, occupation, employer, income

### Lease Management
- Full CRUD with unit and tenant selectors
- Multiple rent schedules: month-end, day 25, day 15, day 1, custom
- Expiry badges with countdown (30/14/7 days)
- Auto-fill rent amount from unit

### Payment Tracking
- Record payments with type (rent/deposit/fee/utility) and reference number
- Auto-computed status: **paid / partial / due / overdue** (via DB trigger)
- Month/year filter with collection summary and overdue alert bar

### Maintenance Kanban
- 5-column board: **Open → Assigned → In Progress → Completed → Cancelled**
- Inline status dropdown and priority badges (Low / Medium / High / Emergency)
- Search by title

### Inspection Checklists
- 8-item condition checklist: walls, windows, doors, electrical, plumbing, flooring, furniture, appliances
- Per-item severity scoring, repair estimates, and issues summary

### Reporting
- 6 report types: monthly revenue, occupancy, vacancy, late payments, property performance, maintenance costs
- Date range picker
- Export to CSV, Excel, and PDF

### Global Search & Notifications
- **⌘K command palette** — search across properties, tenants, and units with keyboard navigation
- **Notification center** — bell icon with unread badge
- **Auto-notifications** via DB triggers: lease expiry, payment overdue, maintenance updates, vacant unit alerts

### Authentication & Access Control
- Sign-up / sign-in via Supabase Auth (email + password)
- Role-based access: **admin / landlord / manager**
- Row Level Security with owner-based policies and admin override

### UI/UX
- Dark/light mode with localStorage persistence and FOUC prevention
- Dark: deep navy + emerald palette
- Light: clean white + emerald palette
- Responsive: desktop sidebar, mobile bottom nav
- Loading skeletons, modal forms, toast notifications (sonner)

## Tech Stack

| Layer        | Technology                         |
|-------------|-----------------------------------|
| Framework   | Next.js 14 (App Router)           |
| Language    | TypeScript                        |
| Styling     | Tailwind CSS, CSS custom properties |
| Backend     | Supabase (PostgreSQL, RLS, Auth)  |
| Data Fetch  | @tanstack/react-query             |
| Forms       | Zod validation                    |
| Charts      | Recharts                          |
| Animations  | Framer Motion                     |
| UI Library  | Radix UI primitives               |
| Notifications | Sonner (toasts)                 |
| Icons       | Lucide React                      |
| Dates       | date-fns                          |
| Deployment  | Vercel                            |

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout (fonts, providers, theme)
│   ├── globals.css                 # Design system (dark/light CSS vars, component classes)
│   ├── login/page.tsx              # Sign-in / sign-up
│   ├── dashboard/
│   │   ├── layout.tsx              # Dashboard shell (sidebar, topbar, bottom nav)
│   │   ├── page.tsx                # Executive dashboard with KPIs & widgets
│   │   ├── properties/page.tsx     # Property grid with CRUD & unit management
│   │   ├── tenants/page.tsx        # Tenant list with CRUD & full profile
│   │   ├── leases/page.tsx         # Lease management with expiry badges
│   │   ├── payments/page.tsx       # Payment tracking & recording
│   │   ├── maintenance/page.tsx    # Maintenance Kanban board
│   │   ├── reports/page.tsx        # Report builder with export
│   │   └── inspections/page.tsx    # Inspection checklists
│   └── settings/page.tsx           # User settings
├── components/
│   ├── Providers.tsx               # QueryClientProvider wrapper
│   ├── CommandSearch.tsx           # ⌘K global search
│   └── ThemeToggle.tsx             # Dark/light mode toggle
└── lib/
    ├── auth-context.tsx            # Role-aware AuthProvider
    ├── supabase.ts                 # Supabase client
    ├── types.ts                    # TypeScript interfaces
    └── utils.ts                    # Utilities (formatCurrency, formatDate, cn, etc.)
```

## Database Schema

The platform uses 12 PostgreSQL tables with Row Level Security:

- **profiles** — User profiles linked to auth.users
- **user_roles** — Role assignments (admin / landlord / manager)
- **properties** — Buildings/complexes
- **units** — Individual rental units
- **tenants** — Tenant profiles
- **leases** — Lease agreements with rent schedules
- **payments** — Payment records with auto-computed status
- **maintenance_requests** — Maintenance tickets with priority and Kanban status
- **inspections** — Unit inspections with checklist
- **inspection_items** — Individual checklist items with severity
- **documents** — File attachments
- **notifications** — Auto-generated notifications

Auto-triggers handle: profile creation on sign-up, payment status updates, and notification generation for lease expiry, overdue payments, and maintenance changes.

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project ([supabase.com](https://supabase.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Kutlwano-Take/landmark-track.git
   cd landmark-track
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   Create `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Database setup**
   Run the migration files in this order in your Supabase SQL Editor:
   - `migration-01-new-schema.sql` — Full production schema (tables, RLS, triggers, enums)
   - `migration-02-notification-triggers.sql` — Auto-notification triggers
   - `migration-03-grants.sql` — Role grants for REST API access

5. **Start development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Deployment

The app is Vercel-ready:

```bash
vercel --prod
```

Add the three environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`) to your Vercel project settings.

## License

ISC
