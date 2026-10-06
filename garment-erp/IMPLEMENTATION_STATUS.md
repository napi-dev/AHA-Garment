# AHA Garment v2 - Implementation Status

## Overview

Clean v2 implementation starting with fresh database. No v1 compatibility code.

## Completed ✅

### Step 0: Foundation (P0 Fixes)
- ✅ UTC date helper functions (`src/lib/date-helper.ts`)
- ✅ Decimal types for money (no Float)
- ✅ Transaction support in `closePeriod()` and `approvePeriod()`
- ✅ Security: server-side permission checks

### Step 1: Schema & Core Models
- ✅ Clean v2 schema (`prisma/schema.prisma`)
  - 8 Departments (flow stages)
  - 24 Jobs (rate carriers)
  - Role enum (kept names, updated roles)
  - AttendanceStatus enum
  - HourlyBox model (replaces sheet+line)
- ✅ Permission system (`src/lib/auth/permissions.ts`)
  - Page access matrix
  - `canControl()` for department control
  - Alert visibility rules
- ✅ Seed script (`prisma/seed.ts`)
  - 8 departments with jobs
  - Default admin user
  - Salary settings

### Step 2: Attendance
- ✅ Attendance actions with status enum (`src/app/(app)/attendance/actions.ts`)
  - `saveAttendance()` with status enum
  - `lockAttendance()` for supervisor submission
  - `getAttendancePage()` with pagination
  - `getAttendanceSummary()` for period summaries

### Step 3: Hourly Box & Day Close
- ✅ Counts actions updated (`src/app/(app)/counts/actions.ts`)
  - `saveHourlyBox()` - points to Job, not Department
  - `closeDay()` - simplified, locks HourlyBox records
  - `reopenDay()` - emergency reopening (Admin only)
  - `generateAndSendDailyReport()` - updated for HourlyBox
  - `purgeMonthlyAuditLog()` - unchanged

### Step 4: Incentive Period Engine
- ✅ Updated `src/lib/incentive/periods.ts` to use Job-based cards
- ✅ Updated period close to aggregate from HourlyBox
- ✅ Updated `src/app/(app)/incentive/[id]/page.tsx` to display Job title in statements
- ✅ Configured payable shortfall rules and statement approval

### Step 5: Shop Operations
- ✅ Updated shop pages for ORDER_PLACER role
- ✅ Enforced view-only access on balance for PMG (action buttons hidden for view-only users)
- ✅ Implemented stock receive, sales, and return flows with validation

### Step 6: Flow Control
- ✅ Updated handover UI to use new Department structure
- ✅ Implemented two-sided handover confirmation with variance detection
- ✅ Integrated investigation cases and discrepancy alerts

### Step 7: Alerts
- ✅ Updated alert system to support full AlertType enum (CONSUMPTION, ORDER_COUNTDOWN, FLOW_VARIANCE, etc.)
- ✅ Implemented role-based alert visibility (`canSeeAlert`) and resolution (`canResolveAlert`)
- ✅ Localized all alert labels with color badges in `src/app/(app)/alerts/page.tsx`

### Step 8: Reports & Automation
- ✅ Updated PDF and HTML daily reports to use HourlyBox (`src/lib/pdf/daily-production-sheet.tsx`, `/api/pdf/daily/[date]`, `/api/reports/daily/[date]`)
- ✅ Telegram reporting system integrated (`src/lib/automation/telegram.ts`)

### Step 9: Mobile PWA
- ✅ Web App Manifest configured (`public/manifest.json`)
- ✅ Mobile-friendly responsive layouts across all flows

## Completed Files Summary

### Priority 1: Core Functionality
1. ✅ `src/app/(app)/attendance/page.tsx` - status enum UI
2. ✅ `src/app/(app)/attendance/attendance-grid.tsx` - status dropdowns
3. ✅ `src/app/(app)/counts/enter/page.tsx` - job-based counts
4. ✅ `src/app/(app)/counts/enter/hourly-count-form.tsx` - job selector
5. ✅ `src/lib/incentive/periods.ts` - job-based aggregation

### Priority 2: Supporting Features
6. ✅ `src/app/(app)/employees/new/page.tsx` & `edit/page.tsx` - job selector & lineNo
7. ✅ `src/app/(app)/incentive/*.tsx` - job-based cards & statements
8. ✅ `src/app/(app)/production/orders/*.tsx` - ORDER_PLACER role access & creation
9. ✅ `src/app/(app)/flow/*.tsx` - two-sided handovers
10. ✅ `src/app/(app)/alerts/page.tsx` - role-based visibility & complete alert types
11. ✅ `src/app/(app)/shop/page.tsx` - PMG balance view-only & ORDER_PLACER operations

### Priority 3: Reports & Polish
12. ✅ `src/lib/pdf/daily-production-sheet.tsx` - HourlyBox format
13. ✅ `src/app/(app)/dashboard/dashboard-charts.tsx` & `page.tsx` - updated queries
14. ✅ All permission imports unified to `@/lib/auth/permissions`

## Schema Migration Path

Since we're starting fresh:

```bash
# 1. Backup if needed (for safety)
pg_dump $DATABASE_URL > backup.sql

# 2. Drop and recreate (or use fresh database)
npx prisma migrate reset --force

# 3. Create fresh schema
npx prisma migrate dev --name v2_init

# 4. Generate Prisma Client
npx prisma generate

# 5. Seed with departments, jobs, admin
npx tsx prisma/seed.ts
```

## Testing Checklist

### Before Production
- [ ] Admin can log in
- [ ] Can create employees with job assignment
- [ ] Can set incentive cards per job
- [ ] Can enter attendance with status enum
- [ ] Can enter hourly counts (job-based)
- [ ] Can close day (locks HourlyBox)
- [ ] Can view attendance summary
- [ ] Can generate daily PDF report
- [ ] Permissions work correctly for each role
- [ ] LINE_SUPERVISOR sees only own line
- [ ] ORDER_PLACER can manage orders and shop
- [ ] PMG has view-only on salary

### After Production Deploy
- [ ] All roles can log in
- [ ] Telegram reports work
- [ ] Mobile PWA works
- [ ] No permission bypass bugs
- [ ] Audit log captures actions
- [ ] Backup schedule configured

## Key Architectural Decisions

1. **Clean v2, no v1 compatibility** - simpler, less technical debt
2. **Department = flow stage** - 8 departments for 7-stage flow + admin
3. **Job = rate carrier** - 24 jobs with individual rates
4. **Status enum for attendance** - clearer than decimal hours
5. **HourlyBox replaces Sheet+Line** - simpler one-to-one model
6. **Permission system in code** - not just UI hiding

## Known Limitations

1. **No historical data migration** - fresh start only
2. **Bundle tracking deprecated** - will remove in future
3. **PeriodConfig will be removed** - using fixed 1st/16th structure
4. **Operation model deprecated** - replaced by Department flow

## Next Immediate Steps

1. ✅ Complete schema replacement
2. ✅ Create seed script
3. 🔧 Update attendance UI components
4. 🔧 Update counts UI components
5. 📋 Update incentive period engine
6. 📋 Test full workflow end-to-end

---

**Last Updated:** January 2025 (initial v2 implementation)
