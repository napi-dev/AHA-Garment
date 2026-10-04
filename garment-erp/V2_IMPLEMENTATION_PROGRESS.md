# AHA Garment v2 Implementation Progress

**Started:** January 1, 2027  
**Based on:** AHA-Garment-v2-Master-Plan.md

## Implementation Order (§12.1)

### Step 0: P0 Fixes + Baseline Migration ⏳ IN PROGRESS
- [ ] Create baseline migration
- [ ] Remove "use server" from lib/incentive/periods.ts
- [ ] Server recomputes hourly counts
- [ ] Scope offences to department
- [ ] Create UTC date helper (toDayKey)
- [ ] Add transactions for period close and day close
- [ ] Ensure every active worker gets incentive line
- **Done when:** Security tests pass

### Step 1: Roles, Departments & Jobs 🔜 NEXT
- [ ] Update Role enum (keep names, change labels)
- [ ] Create Department model (flow stages)
- [ ] Create Job model (rates)
- [ ] Create page-access map
- [ ] Implement canControl() function
- [ ] Create migration script for existing data
- **Done when:** Every page rejects wrong role on server

### Step 2: Employees & Attendance ⏸️ PENDING
- [ ] Update Employee model (add jobId, lineNo)
- [ ] Change AttendanceStatus enum
- [ ] Implement 50-per-page with server-side paging
- [ ] Add save+lock mechanism per supervisor
- [ ] Update payroll pages to 50-per-page
- **Done when:** Attendance rules and salary tests pass

### Step 3: Hourly Box & Day Close ⏸️ PENDING
- [ ] Server recomputes totals
- [ ] Filter employees by አለ status
- [ ] Add "አልሰራም" option
- [ ] Update day close validation
- **Done when:** Totals match client sheet

### Step 4: Fixed Periods & Reports ⏸️ PENDING
- [ ] Implement periodsOf() function
- [ ] Remove PeriodConfig table
- [ ] Generate 15-column reports (5/6 for ጳጉሜን)
- [ ] Add department summary
- [ ] Add monthly summary button
- **Done when:** Real 67-worker data reproduces 3,446 / 2,942.40

### Step 5: Orders & Countdown ⏸️ PENDING
- [ ] Update ProdOrder model (lines, deadlineAt)
- [ ] Implement order board
- [ ] Add countdown alerts (72/48/24h)
- [ ] Update dashboards
- **Done when:** 72/48/24 fire once each

### Step 6: Store & Cutting ⏸️ PENDING
- [ ] Implement store issue
- [ ] Merge materials pages
- [ ] Update cutting form (consumption = kg ÷ pieces)
- [ ] Add fabric availability check
- **Done when:** "በቂ ጨርቅ የለም" and alert work

### Step 7: Handovers & Flow Tables ⏸️ PENDING
- [ ] Create Handover model
- [ ] Implement flow table 1 (per order)
- [ ] Implement flow table 2 (daily department)
- [ ] Add investigations
- [ ] Update /counts/close PDF
- **Done when:** Sample gives −17

### Step 8: Shop Operations ⏸️ PENDING
- [ ] Implement shop receive/sale/return
- [ ] Add shop balance view
- [ ] Add stock-out alerts
- **Done when:** Balance and "አልቋል" work

### Step 9: Alerts, Reports & Cleanup ⏸️ PENDING
- [ ] Implement alerts matrix (§7)
- [ ] Add GeneratedReport model
- [ ] Implement 45-day cleanup
- [ ] Move audit purge to /audit
- [ ] Fix PWA prompt
- **Done when:** Checklist passes

## Files Modified

### Step 0 - Current Focus
- `prisma/schema.prisma` - Baseline + initial changes
- `src/lib/incentive/periods.ts` - Remove "use server"
- `src/lib/date-helper.ts` - NEW: UTC date helper
- `src/app/(app)/counts/actions.ts` - Server-side compute

## Dead Code to Remove (After Implementation)

### Models
- [ ] Bundle, BundleStageLog
- [ ] Operation, OperationDeptMapping
- [ ] PeriodConfig
- [ ] GarmentStyle, StyleStageRoute, BomItem
- [ ] Delivery

### Pages/Routes
- [ ] /production/bundles
- [ ] /production/styles
- [ ] /api/tag/*
- [ ] /quality/inspect/[bundleId]
- [ ] /packing
- [ ] /settings/periods
- [ ] /materials/new OR /materials/receive (merge one)

### Roles
- [ ] SUPER_MANAGER
- [ ] HR_CLERK
- [ ] FINISHED_GOODS_MANAGER
- [ ] OPERATOR

## Notes
- Keep UI untouched where possible
- Ensure old and new versions integrate correctly
- Test each step before moving to next
- Commit after each major milestone
