/**
 * Alerts engine — fires database alerts and Telegram notifications.
 * Called from server actions after relevant writes.
 */

import { db } from "@/lib/db";
import { sendMessage, sendToManagerAndAdmin, CHATS, TEMPLATES } from "./telegram";
import Decimal from "decimal.js";

// ── Low stock ────────────────────────────────────────────────────────────────

export async function checkAndSendLowStockAlert(materialId: string) {
  const material = await db.material.findUnique({ where: { id: materialId } });
  if (!material) return;

  const movements = await db.stockMovement.findMany({
    where: { materialId },
    select: { type: true, quantity: true },
  });

  let onHand = new Decimal(0);
  for (const mv of movements) {
    const q = new Decimal(mv.quantity.toString());
    if (mv.type === "RECEIVE" || mv.type === "RETURN") onHand = onHand.plus(q);
    else onHand = onHand.minus(q);
  }

  const isLow = onHand.lte(new Decimal(material.minimumLevel.toString()));
  if (!isLow) return;

  // Check if we already sent an alert today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const existing = await db.alert.findFirst({
    where: {
      type: "LOW_STOCK",
      reference: materialId,
      resolvedAt: null,
      createdAt: { gte: today },
    },
  });
  if (existing) return; // already alerted today

  const msg = TEMPLATES.lowStockAlert(
    material.nameAm,
    material.sku,
    onHand.toFixed(3),
    material.unit,
    new Decimal(material.minimumLevel.toString()).toFixed(2)
  );

  await db.alert.create({
    data: { type: "LOW_STOCK", message: msg, reference: materialId },
  });

  // Send to manager (automatically sends to admin too)
  await sendToManagerAndAdmin(msg);
  if (CHATS.dept) await sendMessage(CHATS.dept, msg);
}

// ── Wastage alert ────────────────────────────────────────────────────────────

export async function sendWastageAlert(cutJobId: string) {
  const job = await db.cutJob.findUnique({
    where: { id: cutJobId },
    include: { order: true },
  });
  if (!job) return;

  const cons = Number(job.consumption);
  const limitSetting = await db.appSetting.findUnique({ where: { key: "cutting_wastage_limit" } });
  const limit = parseFloat(limitSetting?.value ?? "1.0");

  if (cons <= limit) return;

  const msg = TEMPLATES.wastageAlert(
    job.order.orderNo,
    "—",
    Number(job.kgReceived).toFixed(3),
    String(job.piecesCut),
    cons.toFixed(3),
    "—"
  );

  await db.alert.create({
    data: { type: "CONSUMPTION", message: msg, reference: cutJobId },
  });

  // Send to manager (automatically sends to admin too)
  await sendToManagerAndAdmin(msg);
  if (CHATS.dept) await sendMessage(CHATS.dept, msg);
}

// ── Delayed order alert ──────────────────────────────────────────────────────

export async function checkDelayedOrders() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueOrders = await db.prodOrder.findMany({
    where: {
      status: "ACTIVE",
      deadlineAt: { lt: today },
    },
  });

  for (const order of overdueOrders) {
    // Only send once per day per order
    const existing = await db.alert.findFirst({
      where: {
        type: "DELAYED_ORDER",
        reference: order.id,
        createdAt: { gte: today },
      },
    });
    if (existing) continue;

    const daysLate = Math.floor((today.getTime() - order.deadlineAt!.getTime()) / 86400000);
    const msg = `⏰ ዘግይቶ ትዕዛዝ\nትዕዛዝ: ${order.orderNo}\nተጓዘ ቀናት: ${daysLate} ቀናት`;

    await db.alert.create({
      data: { type: "DELAYED_ORDER", message: msg, reference: order.id },
    });

    // Send to manager (automatically sends to admin too)
    await sendToManagerAndAdmin(msg);
  }
}

// ── Missing day-close alert ───────────────────────────────────────────────────

/**
 * Fires if today has count entries but no DayClose record.
 * Called once per day by the cron job (typically at 20:00 EAT).
 */
export async function checkMissingDayClose() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if day is already closed
  const closed = await db.dayClose.findUnique({ where: { date: today } });
  if (closed) return; // nothing to do

  // Check if there are any submitted count entries today
  // Check if there are any HourlyBox entries today
  const countEntries = await db.hourlyBox.count({
    where: { date: today },
  });
  if (countEntries === 0) return; // no entries, nothing to alert about

  // Check if we already sent this alert today
  const existing = await db.alert.findFirst({
    where: {
      type: "DAY_NOT_CLOSED",
      createdAt: { gte: today },
    },
  });
  if (existing) return;

  const msg = `⚠️ ቀን አልተዘጋም\nዛሬ ${countEntries} ቁጥሮች አሉ ግን ቀኑ አልተዘጋም።\nሱፐርቫይዘሩ ቀን እንዲዘጉ ያሳስቡ።`;

  await db.alert.create({
    data: { type: "DAY_NOT_CLOSED", message: msg, reference: today.toISOString() },
  });

  // Send to manager (automatically sends to admin too)
  await sendToManagerAndAdmin(msg);
}

// ── Resolve alert (Admin / Super Manager marks as resolved) ──────────────────

export async function resolveAlert(alertId: string) {
  // Delete the alert from database when "ፍታ" button is clicked
  await db.alert.delete({
    where: { id: alertId },
  });
}
