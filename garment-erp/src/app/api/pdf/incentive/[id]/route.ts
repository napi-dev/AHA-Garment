import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { renderPdfToBuffer } from "@/lib/pdf/render";
import { IncentiveStatementPdf } from "@/lib/pdf/incentive-statement";
import { ethMonthName, formatAsEthDate } from "@/lib/ethiopian-calendar";
import Decimal from "decimal.js";
import React from "react";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const period = await db.incentivePeriod.findUnique({
    where: { id },
    include: {
      lines: {
        include: { employee: { include: { department: true } } },
        orderBy: [
          { employee: { department: { sortOrder: "asc" } } },
          { employee: { serialNumber: "asc" } },
        ],
      },
    },
  });

  if (!period) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let totalCalc = new Decimal(0);
  let totalPay  = new Decimal(0);

  const lines = period.lines.map((line, idx) => {
    totalCalc = totalCalc.plus(new Decimal(line.calculated.toString()));
    totalPay  = totalPay.plus(new Decimal(line.payable.toString()));
    return {
      serial:       idx + 1,
      nameAm:       line.employee.nameAm,
      deptNameAm:   line.employee.department.nameAm,
      ratePerPiece: line.ratePerPiece.toString(),
      plusPieces:   line.plusPieces,
      minusPieces:  line.minusPieces,
      mistakes:     line.mistakes,
      calculated:   line.calculated.toString(),
      payable:      line.payable.toString(),
      isSuspended:  line.isSuspended,
    };
  });

  const periodLabel = `ኢንሴንቲቭ ክፍያ — ቀን ${period.paymentDay}`;
  const dateRange   = `${formatAsEthDate(period.startDate)} → ${formatAsEthDate(period.endDate)}  (${ethMonthName(period.ethMonth)} ${period.ethYear} ዓ.ም)`;

  const buffer = await renderPdfToBuffer(
    React.createElement(IncentiveStatementPdf, {
      periodLabel,
      dateRange,
      lines,
      totalCalc: totalCalc.toFixed(2),
      totalPay:  totalPay.toFixed(2),
    })
  );

  const filename = `incentive-statement-${period.ethYear}-${String(period.ethMonth).padStart(2, "0")}-day${period.paymentDay}_v${1}.pdf`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control":       "no-store",
    },
  });
}
