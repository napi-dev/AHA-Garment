# ልብስ ፋብሪካ ሥርዓት — Garment Factory System


Tablet-first, fully Amharic garment production and incentive tracking system.

**Stack:** Next.js 15 · TypeScript · Prisma · PostgreSQL (Neon) · Tailwind CSS · Recharts  
**Version:** Phase 3 complete — September 2026


---

## Quick start

### 1. Install dependencies

```bash
cd garment-erp
npm install
```

> Run `npm install qrcode` separately if the QR library is not pulled automatically.

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon **pooler** URL — `?sslmode=require&pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Neon **direct** URL (no `-pooler`) — for migrations + seeds |
| `AUTH_SECRET` | Run `openssl rand -base64 32` |
| `TELEGRAM_BOT_TOKEN` | From @BotFather |
| `TELEGRAM_MANAGER_CHAT_ID` | Super Manager + Admin chat |
| `TELEGRAM_DEPT_GROUP_CHAT_ID` | Department managers group |
| `TELEGRAM_DEV_CHAT_ID` | Developer error notifications |
| `GEMINI_API_KEY` | Optional — free tier for AI daily summary |
| `WORKER_SECRET` | Any strong random string for cron endpoints |

### 3. Push schema and seed

```bash
npx prisma generate
npx prisma db push
npm run db:seed          # Phase 1: 24 depts, incentive card, 9 users
npm run db:seed-phase2   # Phase 2: materials, styles, orders
```

### 4. Run tests — must all pass before pilot

```bash
npm test
```

Expected: **17 acceptance tests pass**, including:
- Period 1 calculated: **3,880.50 ETB** · payable: **4,243.50 ETB**
- Period 2 calculated: **3,765.00 ETB** · payable: **4,009.00 ETB**
- Month calculated: **7,645.50 ETB** · payable: **8,252.50 ETB**

### 5. Start dev server

```bash
npm run dev
```

→ http://localhost:3000 redirects to login.

**System user logins (all PIN: 1234):**

| Code | Role |
|------|------|
| `ADM-001` | Admin (አስተዳዳሪ) |
| `MGR-001` | Super Manager (ሱፐር ማኔጀር) |
| `STK-001` | Store Keeper |
| `CUT-001` | Cutting Manager |
| `PRD-001` | Production Manager |
| `QCI-001` | QC Inspector |
| `FGM-001` | Finished Goods Manager |
| `HRC-001` | HR / Clerk |
| `OPR-001` | Operator |

---

## Project structure

```
garment-erp/
├── prisma/
│   └── schema.prisma          30+ tables — full data model
├── public/
│   ├── manifest.json          PWA manifest
│   ├── sw.js                  Service worker (offline support)
│   └── fonts/                 Place NotoSansEthiopic-Regular.ttf here
├── src/
│   ├── app/
│   │   ├── (app)/             All protected routes (authenticated)
│   │   │   ├── dashboard/     Role-aware dashboard + Recharts
│   │   │   ├── counts/        Hourly count entry + day close
│   │   │   ├── attendance/    HR bulk attendance
│   │   │   ├── employees/     Employee master + salary + offences
│   │   │   ├── incentive/     Periods, statements, approval, summary
│   │   │   ├── salary/        Monthly fixed salary schedule
│   │   │   ├── materials/     Stock movements, receive, issue
│   │   │   ├── suppliers/     Supplier + lot management
│   │   │   ├── cutting/       Cut jobs + wastage calculation
│   │   │   ├── production/    Orders, styles, BOM, bundles board
│   │   │   ├── quality/       QC inspect, defects, repair
│   │   │   ├── packing/       Staging queue + dispatch
│   │   │   ├── reports/       4 core reports hub
│   │   │   ├── alerts/        Alert viewer + resolve
│   │   │   ├── users/         User management (Admin)
│   │   │   ├── audit/         Audit log viewer
│   │   │   └── settings/      App settings, incentive card, period config
│   │   ├── api/
│   │   │   ├── auth/          Auth.js handler
│   │   │   ├── health/        DB health check
│   │   │   ├── pdf/           PDF generation endpoints
│   │   │   ├── tag/           Bundle tag print (HTML + QR)
│   │   │   ├── worker/run     Report queue processor (cron)
│   │   │   ├── cron/alerts    Alert checks (cron)
│   │   │   └── telegram/      Webhook + one-time link
│   │   ├── login/             Login page (employee code + PIN)
│   │   └── offline/           PWA offline fallback page
│   ├── components/
│   │   ├── nav/sidebar.tsx    Role-filtered navigation
│   │   └── ui/
│   │       ├── offline-indicator.tsx
│   │       ├── action-button.tsx
│   │       └── pwa-init.tsx
│   └── lib/
│       ├── auth/              Auth.js config + 9-role permissions
│       ├── automation/        Telegram, Drive, alerts, AI summary, report worker
│       ├── db/                Prisma singleton + seeds
│       ├── ethiopian-calendar.ts
│       ├── i18n/am.ts         300+ Amharic strings
│       ├── incentive/         Engine + period logic + acceptance tests
│       ├── pdf/               React-PDF components (statement, daily sheet)
│       └── qr.ts              QR SVG generator
```

---

## Cron jobs — set up before pilot

Both endpoints require `Authorization: Bearer <WORKER_SECRET>` header.

| Schedule | Endpoint | Purpose |
|----------|----------|---------|
| Every day after shift end (e.g. 20:00 EAT) | `GET /api/cron/alerts` | Low-stock, delayed orders, missing day-close |
| Every 5 minutes | `GET /api/worker/run` | Process pending report jobs (PDF → Drive → Telegram) |

---

## Telegram setup

1. Create a bot via @BotFather → copy `TELEGRAM_BOT_TOKEN`
2. Get chat IDs for manager chat, dept group, dev chat → set in `.env.local`
3. Log in as Super Manager (`MGR-001`) → Settings → Telegram → generate code
4. Send `/link <CODE>` to the bot from the Super Manager's Telegram account
5. Repeat for Admin (`ADM-001`)

---

## Google Drive setup

1. Create a Google Cloud project → enable Drive API
2. Create a service account → download JSON key
3. Set `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (paste the private key with `\n` newlines)
4. Create a folder in Drive → share it with the service account email → copy folder ID → set `GOOGLE_DRIVE_ROOT_FOLDER_ID`

---

## Ethiopic font for PDFs

Download **NotoSansEthiopic-Regular.ttf** from Google Fonts and place it at:

```
public/fonts/NotoSansEthiopic-Regular.ttf
```

Without this file PDFs render boxes for Amharic text. The app still works; only PDFs are affected.

---

## Before the pilot — checklist

- [ ] All `npm test` acceptance tests pass
- [ ] `npm run db:fix-users` verifies login works
- [ ] Telegram bot linked for Super Manager and Admin
- [ ] Real incentive card loaded via `/settings/incentive-card`
- [ ] Real employee list imported
- [ ] Period boundaries verified for current month at `/settings/periods`
- [ ] NotoSansEthiopic font placed in `public/fonts/`
- [ ] Cron jobs scheduled for `/api/worker/run` and `/api/cron/alerts`
- [ ] `WORKER_SECRET` set in environment
- [ ] Google Drive service account connected
- [ ] One supervisor trained on count entry
- [ ] Parallel run started: paper forms alongside system for at least one full month (both pay periods)

---

## Runbook — common operations

### Reset a user PIN

```bash
# Via the UI: /users → [user] → ፒን ቀይር
# Or directly:
npm run db:fix-users
```

### Re-run seed data (safe — all upserts)

```bash
npm run db:seed
npm run db:seed-phase2
```

### Process report queue manually

```bash
curl -H "Authorization: Bearer $WORKER_SECRET" https://your-host/api/worker/run
```

### Check DB connectivity

```bash
curl https://your-host/api/health
# → {"ok":true,"db":"connected"}
```

### Correct locked data

Only the Admin or Super Manager can correct locked data. Every correction requires a reason, is logged in the audit log, and — for pay-related changes — notifies the Super Manager.

1. Log in as Admin or Super Manager
2. Navigate to the relevant record
3. Use the "አስተካክል" (correct) action — it will ask for a reason
4. The old value is preserved in the audit log under `/audit`

### Nightly backup (manual trigger)

The nightly encrypted backup is queued as a report job. To trigger manually:

```bash
curl -H "Authorization: Bearer $WORKER_SECRET" https://your-host/api/worker/run
```

Check `/settings` → Report delivery status to confirm it was sent.

---

## Recovery plan — Super Manager or Admin loss

1. A sealed recovery code is held by the owner (generated on first setup)
2. To promote a deputy:
   - Log in as the remaining top-level user
   - Go to `/users` → find the deputy → edit their role to `SUPER_MANAGER` or `ADMIN`
3. If both top-level accounts are locked:
   - Run `npm run db:fix-users` on the server to reset PINs to `1234`
   - Log in immediately and change PINs

---

## Acceptance test values (from incentive_v4.pdf)

These must match exactly before go-live:

| Test | Expected |
|------|----------|
| Period 1 calculated | **3,880.50 ETB** |
| Period 1 payable | **4,243.50 ETB** |
| Period 2 calculated | **3,765.00 ETB** |
| Period 2 payable | **4,009.00 ETB** |
| Month calculated | **7,645.50 ETB** |
| Month payable | **8,252.50 ETB** |
| Wastage 6.0% | Alert fires |
| Wastage 5.0% exactly | No alert |

Run `npm test` to verify all 17 tests pass.

---

## Phase roadmap

| Phase | Status | Content |
|-------|--------|---------|
| 1 | ✅ Complete | Login, 9 roles, counts, incentive engine, salary, Telegram/Drive |
| 2 | ✅ Complete | Stock, cutting, bundles, QC, packing, dispatch, 4 reports |
| 3 | ✅ Complete | Dashboard charts, AI summary, tags, offline, acceptance tests, users, card editor, PWA |

**Go-live condition:** Parallel run for one full month. Every difference against paper explained.
