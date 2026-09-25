"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { calculateWastage } from "@/lib/incentive/engine";
import { sendWastageAlert } from "@/lib/automation/alerts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Decimal from "decimal.js";

export async function createCutJob(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "cuts:edit");

  const orderId      = String(formData.get("orderId") ?? "");
  const weightIssued = parseFloat(String(formData.get("weightIssued") ?? "0"));
  const weightUsed   = parseFloat(String(formData.get("weightUsed")   ?? "0"));
  const piecesCut    = parseInt(String(formData.get("piecesCut")      ?? "0"), 10);
  const bundleCount  = parseInt(String(formData.get("bundleCount")    ?? "1"), 10);
  const dateStr      = String(formData.get("date") ?? new Date().toISOString().split("T")[0]);
  const date         = new Date(dateStr + "T00:00:00Z");

  if (!orderId || piecesCut < 1 || weightUsed <= 0) throw new Error("ሁሉም ግዴታ መስኮች ያስፈልጋሉ");

  // Get BOM standard weight per piece
  const order = await db.prodOrder.findUnique({
    where: { id: orderId },
    include: { style: { include: { bomItems: { take: 1 } } } },
  });
  if (!order) throw new Error("ትዕዛዙ አልተገኘም");

  const stdWeightPerPiece = order.style.bomItems[0]
    ? Number(order.style.bomItems[0].qtyPerPiece)
    : weightUsed / piecesCut; // fallback: no waste

  const { wastagePct } = calculateWastage(weightUsed, piecesCut, stdWeightPerPiece);

  const job = await db.cutJob.create({
    data: {
      orderId,
      weightIssued: new Decimal(weightIssued).toDecimalPlaces(3),
      weightUsed:   new Decimal(weightUsed).toDecimalPlaces(3),
      piecesCut,
      wastagePct:   new Decimal(wastagePct).toDecimalPlaces(2),
      cuttingManagerId: session.user.id,
      date,
    },
  });

  // Create bundles
  const piecesPerBundle = Math.floor(piecesCut / bundleCount);
  const remainder       = piecesCut % bundleCount;
  const bundleSeq       = await db.bundle.count();

  for (let i = 0; i < bundleCount; i++) {
    const qty  = piecesPerBundle + (i === 0 ? remainder : 0);
    const code = `BND-${String(bundleSeq + i + 1).padStart(5, "0")}`;
    await db.bundle.create({
      data: {
        bundleCode: code,
        cutJobId: job.id,
        quantity: qty,
        currentStage: "CUTTING",
        stageLogs: {
          create: { stage: "CUTTING", enteredById: session.user.id },
        },
      },
    });
  }

  // Stock movement — issue fabric
  const fabMaterial = order.style.bomItems[0]?.materialId ?? null;
  if (fabMaterial) {
    await db.stockMovement.create({
      data: {
        materialId: fabMaterial,
        type: "ISSUE",
        quantity: new Decimal(weightUsed).toDecimalPlaces(3),
        reference: order.orderNumber,
        date,
        enteredById: session.user.id,
        notes: `ቆርጦ — ${job.id.slice(-6)}`,
      },
    });
  }

  await db.auditLog.create({
    data: {
      userId:   session.user.id,
      action:   "CREATE_CUT_JOB",
      entity:   "CutJob",
      entityId: job.id,
      after:    { orderId, weightUsed, piecesCut, wastagePct, bundleCount },
    },
  });

  // Fire wastage alert if above limit
  if (wastagePct > 5) await sendWastageAlert(job.id);

  revalidatePath("/cutting");
  revalidatePath("/production");
  redirect("/cutting");
}
