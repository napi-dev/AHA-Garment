# 🔔 Alert System Setup - 72/48/24 Hour Countdown

## Overview

The system automatically checks for order deadlines and fires alerts at:
- **🟢 72 hours (3 days)** before deadline - "ትዕዛዝ በ3 ቀን ይቀራል። የቆረጣ ዝግጅት ጀምር"
- **🟡 48 hours (2 days)** before deadline - "ትዕዛዝ በ2 ቀን ይቀራል። የስፌት መስመር ሂደት አረጋግጥ"
- **🔴 24 hours (1 day)** before deadline - "ትዕዛዝ በ1 ቀን ይቀራል! የፊኒሺንግ ፍጥነት ጨምር!"

Alerts are sent to:
- Admin (Owner)
- Production Manager
- Order Placer
- Department Telegram group (24h only)

---

## Setup Methods

### Option 1: Vercel Cron (Recommended for Vercel deployments)

Create `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-alerts",
      "schedule": "0 * * * *"
    }
  ]
}
```

This runs the check every hour automatically.

### Option 2: External Cron Service (cron-job.org, EasyCron, etc.)

1. **Generate a secret**:
   ```bash
   openssl rand -base64 32
   ```

2. **Add to .env**:
   ```
   CRON_SECRET=your-generated-secret-here
   ```

3. **Set up cron job**:
   - URL: `https://your-domain.com/api/cron/check-alerts`
   - Method: `GET` or `POST`
   - Schedule: Every hour (`0 * * * *`)
   - Headers:
     ```
     Authorization: Bearer your-generated-secret-here
     ```

### Option 3: Manual Trigger (for testing)

You can manually trigger the check:

```bash
curl -X POST https://your-domain.com/api/cron/check-alerts \
  -H "Authorization: Bearer your-secret"
```

Or visit in browser (if no CRON_SECRET is set):
```
https://your-domain.com/api/cron/check-alerts
```

---

## How It Works

1. **Every hour**, the cron job runs `/api/cron/check-alerts`
2. System checks all `ACTIVE` orders with future deadlines
3. Calculates hours remaining until deadline
4. If within 72h, 48h, or 24h window (±1 hour):
   - Creates `OrderAlert` record (prevents duplicates)
   - Creates `Alert` record (shows in /alerts page)
   - Sends Telegram notification
5. Also checks for:
   - Delayed orders (past deadline)
   - Missing day close (at 8 PM only)

---

## Testing

### 1. Create a test order with near deadline

Login as Order Placer (`ORD-001`, PIN: `1234`) and create an order:
- Deadline: Set to 2 days from now at 10:00 AM
- This should trigger the 48-hour alert

### 2. Manually run the check

```bash
# Without auth (if CRON_SECRET not set)
curl http://localhost:3000/api/cron/check-alerts

# With auth
curl http://localhost:3000/api/cron/check-alerts \
  -H "Authorization: Bearer your-secret"
```

### 3. Check results

- Go to `/alerts` page
- You should see: "🟡 ትዕዛዝ ORD-XXXXX በ2 ቀን ይቀራል። የስፌት መስመር ሂደት አረጋግጥ"
- If Telegram is configured, check your Telegram messages

---

## Alert Recipients

Alerts are sent based on role permissions (defined in `permissions.ts`):

- **ORDER_COUNTDOWN** → Admin, Production Manager, Order Placer
- **DELAYED_ORDER** → Admin, Production Manager, Order Placer
- **DAY_NOT_CLOSED** → Admin, Production Manager

The 24-hour alert also goes to the department Telegram group for maximum visibility.

---

## Database Schema

```prisma
model OrderAlert {
  id          String   @id @default(cuid())
  orderId     String
  order       ProdOrder @relation(...)
  threshold   Int      // 72, 48, or 24 (hours)
  firedAt     DateTime @default(now())
  
  @@unique([orderId, threshold]) // Prevents duplicate alerts
}

model Alert {
  id          String    @id @default(cuid())
  type        AlertType // ORDER_COUNTDOWN, DELAYED_ORDER, etc.
  message     String
  reference   String?   // orderId
  resolvedAt  DateTime? // null = active
  createdAt   DateTime  @default(now())
}
```

---

## Troubleshooting

### Alerts not firing

1. **Check cron is running**:
   - Verify cron job is hitting the endpoint (check logs)
   
2. **Check order has future deadline**:
   ```sql
   SELECT orderNo, deadlineAt, status 
   FROM ProdOrder 
   WHERE status = 'ACTIVE' AND deadlineAt > NOW();
   ```

3. **Check for existing alerts**:
   ```sql
   SELECT * FROM OrderAlert WHERE orderId = 'your-order-id';
   ```
   
4. **Manual test**:
   ```bash
   curl http://localhost:3000/api/cron/check-alerts
   ```

### Duplicate alerts

The system prevents duplicates using `OrderAlert` table with unique constraint on `[orderId, threshold]`.

### Missed alerts

If cron doesn't run for several hours, alerts may be missed. The system checks for ±1 hour windows. Consider:
- Running cron every 30 minutes instead of hourly
- Adding alert recovery logic

---

## Next Steps

1. ✅ Set `CRON_SECRET` in .env
2. ✅ Configure Vercel Cron or external cron service
3. ✅ Create test order with near deadline
4. ✅ Verify alerts appear in /alerts page
5. ✅ Test Telegram notifications (if configured)

---

## Summary

✅ **Implemented**: 72/48/24 hour countdown alerts
✅ **Endpoint**: `/api/cron/check-alerts`
✅ **Schedule**: Every hour
✅ **Recipients**: Admin, Production Manager, Order Placer
✅ **Database**: `OrderAlert` + `Alert` tables
✅ **Notifications**: Telegram integration
