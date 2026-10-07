"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Decimal from "decimal.js";

export async function createCutJob(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "/cutting");

  const orderId    = String(formData.get("orderId") ?? "");
  const fabricId   = String(formData.get("fabricId") ?? "");
  const kgReceived = parseFloat(String(formData.get("kgReceived") ?? "0"));
  const piecesCut  = parseInt(String(formData.get("piecesCut") ?? "0"), 10);
  const dateStr    = String(formData.get("date") ?? new Date().toISOString().split("T")[0]);
  const date       = new Date(dateStr + "T00:00:00Z");
  const notes      = String(formData.get("notes") ?? "").trim() || null;

  if (!orderId || !fabricId || piecesCut < 1 || kgReceived <= 0) {
    throw new Error("ሁሉም አስፈላጊ መስኮች በትክክል መሞላት አለባቸው");
  }

  // 1. Verify order exists
  const order = await db.prodOrder.findUnique({
    where: { id: orderId },
  });
  if (!order) throw new Error("ትዕዛዙ አልተገኘም");

  // 2. Check fabric stock in store
  const movements = await db.stockMovement.findMany({
    where: { materialId: fabricId },
    select: { type: true, quantity: true },
  });

  let fabricStock = 0;
  for (const m of movements) {
    const q = Number(m.quantity);
    if (m.type === "RECEIVE" || m.type === "RETURN") {
      fabricStock += q;
    } else {
      fabricStock -= q;
    }
  }

  if (kgReceived > fabricStock) {
    throw new Error(`በቂ ጨርቅ በመጋዘን ውስጥ የለም! በመጋዘን ያለው ክምችት: ${fabricStock.toFixed(2)} ኪ.ግ ሲሆን የተጠየቀው: ${kgReceived.toFixed(2)} ኪ.ግ ነው`);
  }

  // 3. Read consumption limit from settings (default 1.00)
  const limitSetting = await db.appSetting.findUnique({
    where: { key: "cutting_wastage_limit" },
  });
  const limitUsed = limitSetting ? parseFloat(limitSetting.value) : 1.0;

  // 4. Calculate consumption = kgReceived ÷ piecesCut
  const consumptionVal = kgReceived / piecesCut;
  const consumptionDec = new Decimal(consumptionVal).toDecimalPlaces(4);
  const limitDec       = new Decimal(limitUsed).toDecimalPlaces(2);

  // 5. Create CutJob
  const job = await db.cutJob.create({
    data: {
      orderId,
      fabricId,
      kgReceived:  new Decimal(kgReceived).toDecimalPlaces(3),
      piecesCut,
      consumption: consumptionDec,
      limitUsed:   limitDec,
      date,
      cuttingLeadId: session.user.id,
      notes,
    },
  });

  // 6. Deduct fabric from store via StockMovement (ISSUE)
  await db.stockMovement.create({
    data: {
      materialId:  fabricId,
      type:        "ISSUE",
      quantity:    new Decimal(kgReceived).toDecimalPlaces(3),
      reference:   order.orderNo,
      destination: "ቆራጭ",
      date,
      enteredById: session.user.id,
      notes:       `የቆረጣ ሥራ ORD: ${order.orderNo} (${piecesCut} ፍሬ)`,
    },
  });

  // 7. Check if consumption exceeds limit -> send wastage alert via Telegram
  if (consumptionVal > limitUsed) {
    const { sendWastageAlert } = await import("@/lib/automation/alerts");
    await sendWastageAlert(job.id);
  }

  // 8. Audit log
  await db.auditLog.create({
    data: {
      userId:   session.user.id,
      action:   "CREATE_CUT_JOB",
      entity:   "CutJob",
      entityId: job.id,
      after:    { orderNo: order.orderNo, kgReceived, piecesCut, consumption: consumptionDec.toString(), limitUsed },
    },
  });

  revalidatePath("/cutting");
  revalidatePath("/materials");
  revalidatePath("/dashboard");
  redirect("/cutting");
}
