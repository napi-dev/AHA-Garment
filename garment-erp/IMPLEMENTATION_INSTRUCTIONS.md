# AHA Garment v2 Implementation Instructions

## Current Status: Steps 0, 1, and 2 (Partial) Complete

You now have all the foundation code ready. Here's how to proceed:

---

## 📋 What Has Been Done

### ✅ Step 0: P0 Fixes (Complete)
- Date helper with UTC support
- Security fixes (removed "use server" from library)
- Decimal-based money calculations
- Transaction support for period operations
- All-employee coverage in incentive periods

### ✅ Step 1: Schema & Permissions (Complete)
- Complete v2 schema (`prisma/schema-v2.prisma`)
- Migration script (`src/lib/db/migrate-to-v2.ts`)
- Permission system (`src/lib/auth/permissions-v2.ts`)

### 🔧 Step 2: Attendance (Partial)
- New attendance actions with status enum
- 50-per-page pagination
- Lock mechanism

---

## 🚀 How to Continue

### Option A: Apply Changes Now (Recommended for testing)

1. **Backup your database**
   ```bash
   # Get your DATABASE_URL from .env
   pg_dump "postgresql://..." > backup-$(date +%Y%m%d).sql
   ```

2. **Replace schema**
   ```bash
   cp prisma/schema-v2.prisma prisma/schema.prisma
   ```

3. **Create baseline migration**
   ```bash
   npx prisma migrate dev --name v2-baseline
   npx prisma generate
   ```

4. **Run data migration**
   ```bash
   tsx src/lib/db/migrate-to-v2.ts
   ```

5. **Test the changes**
   - Try logging in
   - Check if departments are created
   - Verify jobs are set up
   - Test permission checks

### Option B: Continue Building (Complete more steps first)

Continue implementing remaining steps before applying changes:
- Step 3: Hourly Box & Day Close
- Step 4: Fixed Periods & Reports
- Step 5: Orders & Countdown
- ... (see V2_IMPLEMENTATION_PROGRESS.md)

---

## 📁 File Integration Guide

### Files to Replace

| Current File | Replace With | When |
|---|---|---|
| `prisma/schema.prisma` | `prisma/schema-v2.prisma` | Before migration |
| `src/lib/auth/permissions.ts` | `src/lib/auth/permissions-v2.ts` | After testing |
| `src/app/(app)/attendance/actions.ts` | `actions-v2.ts` | After UI update |

### Files to Keep

These are NEW files, keep them alongside existing:
- `src/lib/date-helper.ts` ✅
- `src/lib/db/migrate-to-v2.ts` ✅
- All tracking/documentation files ✅

### Import Updates Needed

After schema change, update imports:

```typescript
// OLD
import { Role } from "@prisma/client";
// Role has: SUPER_MANAGER, HR_CLERK, etc.

// NEW - Same import, different values
import { Role } from "@prisma/client";
// Role has: ADMIN, ORDER_PLACER, LINE_SUPERVISOR, etc.

// Update permission checks
// OLD
import { hasPermission } from "@/lib/auth/permissions";

// NEW
import { requirePageAccess, canControl } from "@/lib/auth/permissions-v2";
```

---

## 🔍 Testing Checklist

### After Migration

- [ ] Application starts without errors
- [ ] Can log in as ADMIN
- [ ] Departments show in UI (8 departments)
- [ ] Jobs show under departments (24 jobs)
- [ ] Employees have jobId assigned
- [ ] Old incentive cards still work
- [ ] Attendance records preserved
- [ ] Permission checks work

### Create Test Users

```sql
-- ORDER_PLACER (ORD-001)
INSERT INTO "AppUser" (id, "employeeCode", "pinHash", role, "isActive")
VALUES (
  gen_random_uuid(),
  'ORD-001',
  -- hash of '1234'
  '$2a$10$vfQvLD8V0z3LJXy/xDxkBu5R0Q7xHJDW.P8Zy2R4HH8L2VqJX.LXO',
  'ORDER_PLACER',
  true
);

-- LINE_SUPERVISOR 1 (SUP-001)
INSERT INTO "AppUser" (id, "employeeCode", "pinHash", role, "isActive")
VALUES (
  gen_random_uuid(),
  'SUP-001',
  '$2a$10$vfQvLD8V0z3LJXy/xDxkBu5R0Q7xHJDW.P8Zy2R4HH8L2VqJX.LXO',
  'LINE_SUPERVISOR',
  true
);

-- LINE_SUPERVISOR 2 (SUP-002)
INSERT INTO "AppUser" (id, "employeeCode", "pinHash", role, "isActive")
VALUES (
  gen_random_uuid(),
  'SUP-002',
  '$2a$10$vfQvLD8V0z3LJXy/xDxkBu5R0Q7xHJDW.P8Zy2R4HH8L2VqJX.LXO',
  'LINE_SUPERVISOR',
  true
);
```

### Manual Tasks After Migration

1. **Assign line numbers to employees**
   ```sql
   -- Line 1 workers
   UPDATE "Employee" 
   SET "lineNo" = 1 
   WHERE "nameAm" IN ('worker1', 'worker2', ...);
   
   -- Line 2 workers
   UPDATE "Employee" 
   SET "lineNo" = 2 
   WHERE "nameAm" IN ('worker3', 'worker4', ...);
   
   -- Support staff (no line)
   UPDATE "Employee" 
   SET "lineNo" = NULL 
   WHERE "departmentId" IN (
     SELECT id FROM "Department" 
     WHERE "nameAm" IN ('ቆራጭ', 'ጥራት ተቆጣጣሪ', 'አስተዳደር')
   );
   ```

2. **Review attendance conversions**
   ```sql
   -- Check converted statuses
   SELECT status, COUNT(*) 
   FROM "Attendance" 
   GROUP BY status;
   
   -- Fix any that need correction
   UPDATE "Attendance"
   SET status = 'ABSENT_AUTHORIZED'
   WHERE status = 'ABSENT_UNAUTHORIZED'
   AND -- add your criteria
   ```

3. **Verify incentive cards**
   ```sql
   -- Check all cards have jobs
   SELECT c.id, j."nameAm", c."targetPerHour", c."ratePerPiece"
   FROM "IncentiveCard" c
   JOIN "Job" j ON j.id = c."jobId"
   WHERE c."effectiveTo" IS NULL
   ORDER BY j."nameAm";
   ```

---

## ⚠️ Rollback Plan

If something goes wrong:

```bash
# Stop the application
# Restore database
psql $DATABASE_URL < backup-YYYYMMDD.sql

# Revert schema
git checkout HEAD -- prisma/schema.prisma
npx prisma generate

# Restart application
npm run dev
```

---

## 📊 Expected Results

### Database Changes

**Before:**
- 24 departments (old)
- No jobs table
- Employee has only departmentId
- Attendance has hoursWorked

**After:**
- 8 departments (flow stages)
- 24 jobs (in Job table)
- Employee has departmentId + jobId + lineNo
- Attendance has status enum
- Department has controllers array

### User Changes

**Deactivated:**
- SUPER_MANAGER users
- HR_CLERK users
- FINISHED_GOODS_MANAGER users
- OPERATOR users

**To Create:**
- ORDER_PLACER (ORD-001)
- LINE_SUPERVISOR (SUP-001, SUP-002)

---

## 📞 Next Steps After Testing

1. **If successful:**
   - Continue with Step 3 (Hourly Box)
   - Update UI components gradually
   - Test each page after updates

2. **If issues found:**
   - Document the issue
   - Rollback if critical
   - Fix and retry

3. **Production deployment:**
   - Schedule maintenance window
   - Inform users
   - Run migration during off-hours
   - Have rollback plan ready
   - Monitor for 24 hours

---

## 📚 Reference Documents

- `V2_IMPLEMENTATION_PROGRESS.md` - Overall progress
- `V2_STEP_0_AND_1_SUMMARY.md` - Detailed summary
- `AHA-Garment-v2-Master-Plan.md` - Complete specification
- `prisma/schema-v2.prisma` - New schema
- `src/lib/db/migrate-to-v2.ts` - Migration script

---

## 🆘 Troubleshooting

### "Cannot find module '@prisma/client'"
```bash
npx prisma generate
```

### "Relation does not exist"
```bash
npx prisma migrate dev
# or
npx prisma db push
```

### "Type X is not assignable to type Y"
- Schema changed, need to regenerate client
- Check imports - might be using old types

### Migration fails partway
- Check the error message
- Restore backup
- Fix the specific issue in migrate-to-v2.ts
- Retry

---

**Current Progress: 2.5 of 9 steps (28%)**

Good luck! 🎉
