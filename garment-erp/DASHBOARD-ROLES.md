# 📊 Role-Based Dashboard Implementation Plan

## Overview

Each role now sees only data relevant to their responsibilities:

---

## 🔑 Role-Specific Dashboards

### 1. **Owner (ADMIN)**
**Full Dashboard** - Everything visible
- ✅ Today's total production
- ✅ 14-day production trend graph
- ✅ Department-wise production
- ✅ Active orders & overdue orders
- ✅ Order countdown: 🟢72h, 🟡48h, 🔴24h alerts with order numbers
- ✅ Open alerts count
- ✅ Workers above target
- ✅ **NEW**: Total shop sales (ETB) - today & this month
- ✅ Incentive period status
- ✅ All quick actions

### 2. **Production Manager (PRODUCTION_MANAGER)**
**Almost Same as Owner** - Except shop sales detail
- ✅ Today's total production
- ✅ 14-day production trend graph
- ✅ Department-wise production
- ✅ Active orders & overdue orders
- ✅ Order countdown: 🟢72h, 🟡48h, 🔴24h alerts with order numbers
- ✅ Open alerts count
- ✅ Workers above target
- ✅ Incentive period status
- ✅ All production quick actions

### 3. **Store Keeper (STORE_KEEPER)**
**Materials & Stock Focus**
- 📦 Total materials in stock
- 📈 Today's movements (in/out)
- ⚠️ Low stock alerts count
- Quick actions:
  - Receive material
  - Issue material
  - View suppliers

### 4. **Cutting Manager (CUTTING_MANAGER)**
**Cutting Department Focus**
- ✂️ Today's cut pieces
- ⚠️ Wastage alerts
- 👥 Cutting workers count
- 📋 Active cutting jobs
- Quick actions:
  - New cutting job
  - Cutting history
  - View alerts

### 5. **QC Inspector (QC_INSPECTOR)**
**Quality Control Focus**
- ✅ Today's inspected pieces
- ❌ Today's defects found
- 📊 Pass rate percentage
- 🔄 Pending rework count
- Quick actions:
  - New inspection
  - View defects
  - Rework queue

### 6. **Line Supervisor (LINE_SUPERVISOR)**
**Line Production Focus** (Line 1 or Line 2)
- 📦 Today's production (their line only)
- 🎯 Workers who hit target
- 👥 Workers present/total
- ⏰ Average hourly production
- Quick actions:
  - Enter counts
  - Mark attendance
  - Close day

### 7. **Order Placer (ORDER_PLACER)**
**Orders & Shop Focus**
- 📋 Active orders count
- 🟢 Orders due in 72h (3 days)
- 🟡 Orders due in 48h (2 days) - **with order numbers!**
- 🔴 Orders due in 24h (1 day) - **with order numbers! URGENT**
- 💰 Shop sales today (ETB)
- 📦 Shop inventory count
- Quick actions:
  - New order
  - Shop sales
  - Receive shop stock

---

## 🔔 Order Countdown Display

### For Owner & Production Manager:
```
┌─────────────────────────────────────────┐
│ ትዕዛዞች የጊዜ ገደብ ማስታወሻ               │
├─────────────────────────────────────────┤
│ 🟢 በ3 ቀናት ውስጥ (2 ትዕዛዞች)             │
│    • ORD-00123 - በ68 ሰዓታት              │
│    • ORD-00125 - በ71 ሰዓታት              │
├─────────────────────────────────────────┤
│ 🟡 በ2 ቀናት ውስጥ (1 ትዕዛዝ)               │
│    • ORD-00124 - በ45 ሰዓታት              │
├─────────────────────────────────────────┤
│ 🔴 በ1 ቀን ውስጥ! (1 ትዕዛዝ)               │
│    • ORD-00126 - በ18 ሰዓታት ብቻ!         │
└─────────────────────────────────────────┘
```

### For Order Placer:
Same as above, but as primary focus of their dashboard

---

## 💰 Shop Sales Widget (Owner Only)

```
┌─────────────────────────────────────────┐
│ የሱቅ ሽያጭ ማጠቃለያ                        │
├─────────────────────────────────────────┤
│ የዛሬ ሽያጭ:     12,450.00 ብር            │
│ የዚህ ወር ሽያጭ:  245,800.00 ብር          │
│ የተሸጡ ፍሬዎች:   245 ፍሬዎች                │
│ አማካይ ዋጋ:      50.82 ብር/ፍሬ           │
└─────────────────────────────────────────┘
```

---

## 🔧 Implementation Status

### ✅ Completed:
1. Created role-specific dashboard components (`role-dashboards.tsx`)
2. Created order countdown alert system
3. Created `/api/cron/check-alerts` endpoint
4. Added `OrderAlert` table to track fired alerts

### 🚧 To Implement:

1. **Update dashboard/page.tsx**:
   - Add role detection
   - Query data based on role
   - Render appropriate component
   - Add order countdown widget
   - Add shop sales widget for owner

2. **Add shop movement queries**:
   ```typescript
   // Today's shop sales
   const todaySales = await db.shopMovement.aggregate({
     where: {
       type: "SALE",
       date: today,
     },
     _sum: { total: true, qty: true },
   });
   
   // This month's sales
   const monthStart = new Date(eth.year, eth.month - 1, 1);
   const monthSales = await db.shopMovement.aggregate({
     where: {
       type: "SALE",
       date: { gte: monthStart, lte: today },
     },
     _sum: { total: true },
   });
   ```

3. **Add order countdown query**:
   ```typescript
   const now = new Date();
   const orders72h = await db.prodOrder.count({
     where: {
       status: "ACTIVE",
       deadlineAt: {
         gte: now,
         lte: new Date(now.getTime() + 72 * 60 * 60 * 1000),
       },
     },
   });
   
   // Similar for 48h and 24h
   ```

4. **Create order countdown component** to show actual order numbers with remaining hours

5. **Add line number detection** for Line Supervisors:
   - Check employee.lineNo
   - Filter data by line number

---

## 📝 Next Steps

1. **Run seeds**:
   ```bash
   npm run db:seed
   npm run db:seed-data
   ```

2. **Create test orders** with various deadlines:
   - 3 days from now
   - 2 days from now
   - 1 day from now

3. **Set up cron job**:
   - Add `CRON_SECRET` to .env
   - Configure cron service
   - Test alert firing

4. **Add shop sales records**:
   - Create test sales in `ShopMovement` table
   - Verify calculations

5. **Test each role**:
   - Login as each user
   - Verify correct dashboard shows
   - Verify data is role-specific

---

## 🎯 Design Principles

1. **Minimize Cognitive Load**: Each role sees only what they need
2. **Actionable Data**: Quick actions relevant to their work
3. **Visual Hierarchy**: Important alerts prominently displayed
4. **Performance**: Query only necessary data for each role
5. **Consistent UI**: Same card style across all dashboards

---

## 🔒 Security

- Dashboard queries filtered by role permissions
- Line supervisors see only their line data
- Order placer cannot see production details
- Store keeper cannot see sales figures
- All data access controlled via `getPageAccess()`

---

## Files Created/Modified

- ✅ `role-dashboards.tsx` - New role-specific components
- ✅ `alerts.ts` - Added `checkOrderCountdown()`
- ✅ `/api/cron/check-alerts/route.ts` - Cron endpoint
- ✅ `CRON-SETUP.md` - Setup documentation
- 🚧 `dashboard/page.tsx` - Needs update for role routing
- 🚧 Database - Needs shop sales seed data
