# ልብስ ፋብሪካ ሥርዓት — Garment Factory System

Tablet-first, fully Amharic garment production and incentive tracking system.
Built with Next.js 15 · TypeScript · Prisma · PostgreSQL · Tailwind CSS.

---

## Quick start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```
Edit `.env.local` and fill in:
- `DATABASE_URL` — your remote PostgreSQL connection string
- `AUTH_SECRET` — run `openssl rand -base64 32` to generate one

### 3. Push the schema to the database
```bash
npm run db:push
```
Or to create a migration file:
```bash
npm run db:migrate
```

### 4. Seed reference data
```bash
npm run db:seed
```
This creates 24 departments, the incentive card from the appendix, 67 sample
employees, and 9 system users (one per role, all PIN: **1234**).

System user logins after seeding:
| Code     | Role              |
|----------|-------------------|
| ADM-001  | Admin             |
| MGR-001  | Super Manager     |
| STK-001  | Store Keeper      |
| CUT-001  | Cutting Manager   |
| PRD-001  | Production Manager|
| QCI-001  | QC Inspector      |
| FGM-001  | Finished Goods Mgr|
| HRC-001  | HR / Clerk        |
| OPR-001  | Operator          |

### 5. Run the incentive engine tests
```bash
npm test
```
Must pass: period 1 = 3,880.50 ETB, period 2 = 3,765.00 ETB, month = 7,645.50 ETB.

### 6. Start development server
```bash
npm run dev
```
Open http://localhost:3000 → redirects to login.

---

## Project structure

```
src/
  app/
    (app)/               # Protected routes (logged-in users)
      dashboard/         # Role-aware dashboard
      counts/
        enter/           # Hourly count entry grid
        close/           # Day close
      ...                # Other modules added in Phase 2
    login/               # Login page
    api/auth/            # Auth.js route handler
  components/
    nav/sidebar.tsx      # Role-filtered navigation
  lib/
    auth/
      config.ts          # Auth.js credentials provider
      permissions.ts     # 18-permission role matrix
    db/
      index.ts           # Prisma client singleton
      seed.ts            # Reference data seed
    ethiopian-calendar.ts # Gregorian ↔ Ethiopian conversion + period logic
    i18n/am.ts           # All Amharic UI strings
    incentive/
      engine.ts          # Pure calculation functions + vitest tests
  middleware.ts           # Route protection
  types/next-auth.d.ts   # Session type augmentation
prisma/
  schema.prisma          # Full data model (30+ tables)
```

---

## Incentive formula

```
Calculated = (plusPieces − minusPieces − 2 × mistakes) × ratePerPiece
Payable    = max(0, Calculated)   [0 if suspended]
```

Acceptance test values from incentive_v4.pdf:
- Period 1 calculated: **3,880.50 ETB** · payable: **4,243.50 ETB**
- Period 2 calculated: **3,765.00 ETB** · payable: **4,009.00 ETB**
- Month calculated:    **7,645.50 ETB** · payable: **8,252.50 ETB**

---

## Phase roadmap

| Phase | Status | Content |
|-------|--------|---------|
| 1 | 🔨 In progress | Login, roles, counts, incentive engine, salary schedule, Telegram/Drive |
| 2 | Planned | Stock, cutting, bundles, QC, reports |
| 3 | Planned | Delivery, dashboards, AI summary, offline queue |

---

## Notes

- Money is stored as `Decimal(10,2)` — never `Float`. Uses `decimal.js` in calculations.
- All UI text lives in `src/lib/i18n/am.ts` — never hard-coded.
- Ethiopian calendar conversions are in `src/lib/ethiopian-calendar.ts` with inline tests.
- Counts stay as drafts on submit; they move to VERIFIED by the Production Manager,
  then LOCKED when the day is closed. Only Admin/Super Manager can correct locked data.
- The Super Manager is the only role that can approve incentive statements.
