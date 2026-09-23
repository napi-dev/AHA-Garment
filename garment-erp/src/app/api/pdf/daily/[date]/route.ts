import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import { DailyProductionSheetPdf } from "@/lib/pdf/daily-production-sheet";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import React from "react";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date: dateStr } = await params;
  const date = new Date(dateStr + "T00:00:00Z");

  // Load all count lines for the day with operation mapping
  const lines = await db.hourlyCountLine.findMany({
    where: { sheet: { date }, status: { not: "DRAFT" } },
    include: {
      employee: true,
      department: true,
      sheet: { include: { operation: true } },
    },
    orderBy: [
      { department: { sortOrder: "asc" } },
      { employee: { serialNumber: "asc" } },
    ],
  });

  // Get incentive cards for target info
  const cardMap = new Map<string, number>();
  for (const line of lines) {
    if (!cardMap.has(line.departmentId)) {
      const card = await db.incentiveCard.findFirst({
        where: {
          departmentId: line.departmentId,
          effectiveFrom: { lte: date },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
        },
        orderBy: { effectiveFrom: "desc" },
      });
      cardMap.set(line.departmentId, card?.targetPerHour ?? 0);
    }
  }

  let totalProduced = 0;
  let aboveTarget   = 0;

  const rows = lines.map((line, idx) => {
    const targetPerHour = cardMap.get(line.departmentId) ?? 0;
    const targetPerDay  = targetPerHour * 8;
    const produced      = line.totalProduced;
    totalProduced      += produced;
    if (line.plusPieces > 0) aboveTarget++;

    const diff = line.plusPieces - line.minusPieces;
    const pct  = targetPerDay > 0 ? Math.round((produced / targetPerDay) * 100 * 10) / 10 : 0;

    return {
      serial:          idx + 1,
      nameAm:          line.employee.nameAm,
      operationAm:     line.sheet.operation.nameAm,
      machineType:     line.department.nameEn ?? "",
      targetPerDay,
      produced,
      plusPieces:      line.plusPieces,
      minusPieces:     line.minusPieces,
      percentOfTarget: pct,
    };
  });

  const buffer = await renderToBuffer(
    React.createElement(DailyProductionSheetPdf, {
      dateLabel:      formatAsEthDate(date),
      supervisorName: "",
      shift:          "ቀን",
      rows,
      totalProduced,
      aboveTarget,
      totalWorkers:   rows.length,
    })
  );

  const filename = `daily-production-${dateStr}_v1.pdf`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control":       "no-store",
    },
  });
}
