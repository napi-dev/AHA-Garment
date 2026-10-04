import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date: dateStr } = await params;
  const date = new Date(dateStr + "T00:00:00Z");

  // Load all count lines for the day with operation mapping
  const lines = await db.hourlyBox.findMany({
    where: { date },
    include: {
      employee: true,
      department: true,
      job: true,
    },
    orderBy: [
      { department: { flowOrder: "asc" } },
      { employee: { serialNumber: "asc" } },
    ],
  });

  // Get incentive cards for target info
  const cardMap = new Map<string, number>();
  for (const line of lines) {
    if (line.jobId && !cardMap.has(line.jobId)) {
      const card = await db.incentiveCard.findFirst({
        where: {
          jobId: line.jobId,
          effectiveFrom: { lte: date },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
        },
        orderBy: { effectiveFrom: "desc" },
      });
      cardMap.set(line.jobId, card?.targetPerHour ?? 0);
    }
  }

  let totalProduced = 0;
  let aboveTarget   = 0;

  const rows = lines.map((line, idx: number) => {
    const targetPerHour = (line.jobId ? cardMap.get(line.jobId) : null) ?? (line.targetForDay ? Math.round(line.targetForDay / 8) : 0);
    const targetPerDay  = line.targetForDay > 0 ? line.targetForDay : targetPerHour * 8;
    const produced      = line.totalProduced;
    totalProduced      += produced;
    if (line.plusPieces > 0) aboveTarget++;

    const pct  = targetPerDay > 0 ? Math.round((produced / targetPerDay) * 100 * 10) / 10 : 0;

    return {
      serial:          idx + 1,
      nameAm:          line.employee.nameAm,
      operationAm:     line.job?.nameAm ?? "",
      machineType:     line.department.nameEn ?? "",
      targetPerDay,
      produced,
      plusPieces:      line.plusPieces,
      minusPieces:     line.minusPieces,
      percentOfTarget: pct,
    };
  });

  // Dynamic import to avoid build-time issues with @react-pdf/renderer
  const { renderPdfToBuffer } = await import("@/lib/pdf/render");
  const { DailyProductionSheetPdf } = await import("@/lib/pdf/daily-production-sheet");
  const React = await import("react");

  const buffer = await renderPdfToBuffer(
    React.createElement(DailyProductionSheetPdf, {
      dateLabel:      formatAsEthDate(date),
      dateFilename:   dateStr.replace(/\//g, "-"),
      supervisorName: "",
      shift:          "ቀን",
      rows,
      totalProduced,
      aboveTarget,
      totalWorkers:   rows.length,
      auditRows:      [], // Empty audit rows for now
    })
  );

  const filename = `daily-production-${dateStr}_v1.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control":       "no-store",
    },
  });
}
