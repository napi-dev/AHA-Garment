"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ── Record a new defect ───────────────────────────────────────────────────────
export async function recordDefect(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "/quality");

  const orderId           = String(formData.get("orderId") ?? "").trim();
  const defectType        = String(formData.get("defectType") ?? "").trim();
  const responsibleDeptId = String(formData.get("responsibleDeptId") ?? "").trim();
  const responsibleEmpId  = String(formData.get("responsibleEmpId") ?? "").trim() || null;
  const piecesAffected    = parseInt(String(formData.get("piecesAffected") ?? "0"), 10);
  const dateStr           = String(formData.get("date") ?? new Date().toISOString().split("T")[0]);
  const date              = new Date(dateStr + "T00:00:00Z");
  const notes             = String(formData.get("notes") ?? "").trim() || null;

  if (!orderId || !defectType || !responsibleDeptId || piecesAffected < 1) {
    throw new Error("ሁሉም አስፈላጊ መስኮች በትክክል መሞላት አለባቸው");
  }

  const defect = await db.defect.create({
    data: {
      orderId,
      defectType,
      responsibleDeptId,
      responsibleEmpId,
      piecesAffected,
      date,
      notes,
    },
  });

  await db.auditLog.create({
    data: {
      userId:   session.user.id,
      action:   "RECORD_DEFECT",
      entity:   "Defect",
      entityId: defect.id,
      after:    { orderId, defectType, piecesAffected },
    },
  });

  revalidatePath("/quality");
  redirect("/quality");
}

// ── Mark defect as repaired ──────────────────────────────────────────────────
export async function markRepaired(defectId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "/quality");

  await db.defect.update({
    where: { id: defectId },
    data: { repaired: true, repairedById: session.user.id, repairedAt: new Date() },
  });

  await db.auditLog.create({
    data: {
      userId:   session.user.id,
      action:   "MARK_REPAIRED",
      entity:   "Defect",
      entityId: defectId,
      after:    { repairedAt: new Date().toISOString() },
    },
  });

  revalidatePath("/quality");
  redirect("/quality?status=repair");
}
