# AHA Garment ERP - Setup Guide

This guide will help you set up the AHA Garment ERP system with a clean v2 database.

## Prerequisites

1. **Node.js** 18+ and npm
2. **PostgreSQL** database (local or remote like Neon, Supabase)
3. **Git** for version control

## Initial Setup

### 1. Clone and Install

```bash
# Navigate to project
cd garment-erp

# Install dependencies
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
DIRECT_URL="postgresql://user:password@host:5432/database?sslmode=require"

# NextAuth
AUTH_SECRET="generate-a-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Telegram (optional)
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
TELEGRAM_MANAGER_CHAT_ID="your-chat-id"
TELEGRAM_DEPT_GROUP_CHAT_ID="group-chat-id"
```

**Generate AUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 3. Initialize Database

```bash
# Generate Prisma Client
npx prisma generate

# Create database schema
npx prisma migrate dev --name init

# Seed with initial data (departments, jobs, admin user)
npx tsx prisma/seed.ts
```

This will create:
- **8 Departments** (flow stages): መቀበያና መጋዘን, ቆራጭ, ስፌት, ጥራት, ቅንጨባ, ስታይል, ማሳያ, ማሸጊያ, አስተዳደር
- **24 Jobs** (rate carriers) distributed across departments
- **1 Admin user** with code `ADM-001` and PIN `123456`

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

**Default Login:**
- Employee Code: `ADM-001`
- PIN: `123456`
- ⚠️ **Change this PIN immediately after first login!**

## Database Schema Overview

### Core Structure

```
AppUser (7 roles)
  ↓
Employee
  ├── Department (8 flow stages)
  ├── Job (24 rate carriers)
  └── lineNo (1, 2, or null)

Attendance (status enum)
  → PRESENT | ABSENT_UNAUTHORIZED | ABSENT_AUTHORIZED | SICK_LEAVE

HourlyBox (per employee per day)
  → Points to Job (not Department)
  → h1-h8 (hourly counts)
  → isLocked (after day close)

DayClose
  → Locks all HourlyBox records for the day
```

### Key Changes from v1

1. **Role Enum:** Kept names (ADMIN, PRODUCTION_MANAGER) but removed old roles (SUPER_MANAGER, HR_CLERK, FINISHED_GOODS_MANAGER, OPERATOR). Added ORDER_PLACER and LINE_SUPERVISOR.

2. **Department:** Now represents **flow stages** (8 departments instead of 24).

3. **Job:** NEW model representing **rate carriers** (24 jobs within departments).

4. **Employee:** Added `jobId` and `lineNo` fields.

5. **Attendance:** Replaced `hoursWorked` decimal with `AttendanceStatus` enum.

6. **HourlyBox:** Replaces HourlyCountSheet + HourlyCountLine. Points to Job instead of Department.

7. **IncentiveCard:** Points to Job (not Department).

## User Roles & Permissions

### ADMIN (ባለቤት - Owner)
- Full access to everything
- Only role that can:
  - Approve incentive periods
  - Edit salary amounts
  - Edit attendance bonus
  - Purge audit logs
  - Manage users

### PRODUCTION_MANAGER (የምርት ኃላፊ - PMG)
- Almost everything except owner-only items
- Can close incentive periods (but not approve)
- View-only access to salary and payroll

### ORDER_PLACER (የትዕዛዝ ተቀባይ)
- Create and manage orders
- Shop operations (receive, sale, return)
- View shop balance

### LINE_SUPERVISOR (የመስመር ሱፐርቫይዘር)
- Attendance for own line (lineNo)
- Counts for ስፌት and ቅንጨባ only
- Flow control for own departments

### CUTTING_MANAGER (የቆረጣ ኃላፊ)
- Full access to cutting
- Counts for ቆራጭ only

### QC_INSPECTOR (የጥራት ተቆጣጣሪ)
- Quality control
- Counts for ጥራት only
- Defect tracking

### STORE_KEEPER (የመጋዘን ኃላፊ)
- Materials and stock
- Suppliers
- Receiving

## Development Workflow

### Creating a New User

```typescript
// Example: Create a LINE_SUPERVISOR
await db.appUser.create({
  data: {
    employeeCode: "SUP-001",
    pinHash: await bcrypt.hash("1234", 10),
    role: "LINE_SUPERVISOR",
    nameAm: "አበበ ተስፋዬ",
    isActive: true,
  },
});
```

### Creating Employees

```typescript
// Get a department and job
const dept = await db.department.findFirst({
  where: { nameAm: "ስፌት" },
});

const job = await db.job.findFirst({
  where: {
    departmentId: dept.id,
    nameAm: "የመስመር 1 ስፌት",
  },
});

// Create employee
await db.employee.create({
  data: {
    serialNumber: 1, // auto-increment in production
    employeeCode: "EMP-001",
    nameAm: "ፀጋዬ መኮንን",
    departmentId: dept.id,
    jobId: job.id,
    lineNo: 1, // 1, 2, or null
    isActive: true,
  },
});
```

### Setting Incentive Rates

```typescript
// Create incentive card for a job
await db.incentiveCard.create({
  data: {
    jobId: job.id,
    targetPerHour: 50, // 50 pieces per hour
    ratePerPiece: 0.75, // 0.75 ETB per piece
    effectiveFrom: new Date("2024-01-01"),
    effectiveTo: null, // currently active
    setByUserId: adminUserId,
  },
});
```

## Prisma Studio

View and edit data with Prisma Studio:

```bash
npx prisma studio
```

## Database Backup

### Backup (if using PostgreSQL)

```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### Restore

```bash
psql $DATABASE_URL < backup-20240101.sql
```

## Production Deployment

### 1. Update Environment Variables

Set production values for:
- `DATABASE_URL` and `DIRECT_URL`
- `AUTH_SECRET` (use a strong random secret)
- `NEXTAUTH_URL` (your production URL)

### 2. Deploy Database

```bash
# Push schema to production database
npx prisma migrate deploy

# Seed production data
npx tsx prisma/seed.ts
```

### 3. Build and Deploy

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Troubleshooting

### Prisma Client Out of Sync

```bash
npx prisma generate
```

### Database Connection Issues

Check that:
1. `DATABASE_URL` is correct in `.env`
2. Database is accessible from your network
3. SSL is configured correctly (add `?sslmode=require` if needed)

### Migration Errors

If migrations fail:
```bash
# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Or manually fix and retry
npx prisma migrate dev
```

## Next Steps

1. **Change default PIN** for ADM-001
2. **Create additional users** (ORDER_PLACER, LINE_SUPERVISOR, etc.)
3. **Add employees** with their departments and jobs
4. **Set up incentive cards** for each job
5. **Configure Telegram** for automated reports (optional)

## Support

For issues or questions:
- Check the code documentation
- Review the master plan document
- Contact the development team

---

**AHA Garment ERP v2** - Built with Next.js, Prisma, and PostgreSQL
