"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BundleStage } from "@prisma/client";

// ── Submit inspection (pass or fail + defects) ───────────────────────────────
export async function submitInspection(
  bundleId: string,
  inspectorId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "qc:edit");

  const passed = formData.get("passed") === "true";
  const notes  = String(formData.get("notes") ?? "").trim() || null;

  // Collect defect rows
  const defects: Array<{ type: string; stage: BundleStage; pieces: number }> = [];
  for (let i = 0; i < 3; i++) {
    const type   = String(formData.get(`defect_type_${i}`)   ?? "").trim();
    const stage  = String(formData.get(`defect_stage_${i}`)  ?? "").trim();
    const pieces = parseInt(String(formData.get(`defect_pieces_${i}`) ?? "0"), 10);
    if (type && stage && pieces > 0) {
      defects.push({ type, stage: stage as BundleStage, pieces });
    }
  }

  const inspection = await db.qcInspection.create({
    data: {
      bundleId,
      inspectedById: session.user.id,
      passed,
      notes,
      defects: {
        create: defects.map((d) => ({
          defectType: d.type,
          responsibleStage: d.stage,
          piecesAffected: d.pieces,
        })),
      },
    },
  });

  // Advance bundle: passed → STYLING_HITPRESS; failed → send back to SEWING
  const nextStage: BundleStage = passed ? "STYLING_HITPRESS" : "SEWING";
  await db.bundle.update({
    where: { id: bundleId },
    data: {
      currentStage: nextStage,
      stageLogs: {
        create: { stage: nextStage, enteredById: session.user.id },
      },
    },
  });

  await db.auditLog.create({
    data: {
      userId:   session.user.id,
      action:   "QC_INSPECTION",
      entity:   "QcInspection",
      entityId: inspection.id,
      after:    { bundleId, passed, defectCount: defects.length },
    },
  });

  revalidatePath("/quality");
  redirect("/quality");
}

// ── Mark defect as repaired ──────────────────────────────────────────────────
export async function markRepaired(defectId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "qc:edit");

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
