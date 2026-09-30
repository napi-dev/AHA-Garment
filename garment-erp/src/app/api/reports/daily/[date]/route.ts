import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatAsEthDate, gregorianToEth } from "@/lib/ethiopian-calendar";

/**
 * GET /api/reports/daily/[date]
 * Returns a printable HTML report for the daily production sheet
 * Can be opened in browser and printed to PDF via Ctrl+P
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date: dateStr } = await params;
  const date = new Date(dateStr + "T00:00:00Z");
  const dayEnd = new Date(date);
  dayEnd.setUTCHours(23, 59, 59, 999);

  // Fetch production data
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

  // Fetch audit logs
  const auditLogs = await db.auditLog.findMany({
    where: { createdAt: { gte: date, lte: dayEnd } },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { employeeCode: true } } },
  });

  // Get incentive cards
  const cardMap = new Map<string, number>();
  const deptIds = [...new Set(lines.map((l) => l.departmentId))];
  for (const deptId of deptIds) {
    const card = await db.incentiveCard.findFirst({
      where: {
        departmentId: deptId,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
      orderBy: { effectiveFrom: "desc" },
    });
    cardMap.set(deptId, card?.targetPerHour ?? 0);
  }

  let totalProduced = 0;
  let aboveTarget = 0;

  const rows = lines.map((line, idx) => {
    const targetPerHour = cardMap.get(line.departmentId) ?? 0;
    const targetPerDay = targetPerHour * 8;
    totalProduced += line.totalProduced;
    if (line.plusPieces > 0) aboveTarget++;
    const pct = targetPerDay > 0
      ? Math.round((line.totalProduced / targetPerDay) * 100 * 10) / 10
      : 0;
    const diff = line.plusPieces > 0 ? line.plusPieces : -line.minusPieces;

    return {
      serial: idx + 1,
      nameAm: line.employee.nameAm,
      operationAm: line.sheet.operation.nameAm,
      machineType: line.department.nameEn ?? line.department.nameAm,
      targetPerDay,
      produced: line.totalProduced,
      diff,
      pct,
    };
  });

  const eth = gregorianToEth(date);
  const dateLabel = formatAsEthDate(date);
  const dateSlug = `${eth.day}-${eth.month}-${eth.year}`;

  // Action labels for audit log
  const actionLabels: Record<string, string> = {
    SAVE_HOURLY_COUNT: "ቁጥር ገባ",
    VERIFY_COUNT: "ቁጥር ተረጋገጠ",
    CLOSE_DAY: "ቀን ተዘጋ",
    CLOSE_INCENTIVE_PERIOD: "ወቅት ተጠናቀቀ",
    APPROVE_INCENTIVE_PERIOD: "ወቅት ፀደቀ",
    SET_SALARY: "ደሞዝ ተቀየረ",
    APPROVE_SALARY_SCHEDULE: "ደሞዝ ሰሌዳ ፀደቀ",
    CREATE_EMPLOYEE: "ሠራተኛ ተጨመረ",
    UPDATE_EMPLOYEE: "ሠራተኛ ተስተካከለ",
    DELETE_EMPLOYEE: "ሠራተኛ ተሰረዘ",
    RECORD_OFFENCE: "ጥፋት ሰነድ ሆነ",
    LIFT_SUSPENSION: "ታግዱ ተነሳ",
    SAVE_ATTENDANCE: "መገኘት ተቀመጠ",
    RECEIVE_STOCK: "ጥሬ ዕቃ ገባ",
    ISSUE_STOCK: "ጥሬ ዕቃ ወጣ",
    UPDATE_SETTING: "ቅንብር ተቀየረ",
    SET_DATE_OVERRIDE: "ቀን ተስተካከለ",
    CREATE_USER: "ተጠቃሚ ተፈጠረ",
    UPDATE_USER: "ተጠቃሚ ተቀየረ",
    RESET_PIN: "ፒን ተቀየረ",
  };

  const auditRows = auditLogs.map((log) => {
    let timeStr = "—";
    try {
      timeStr = log.createdAt.toLocaleTimeString("en-ET", { 
        hour: "2-digit", 
        minute: "2-digit",
        hour12: true 
      });
    } catch {
      timeStr = "—";
    }

    return {
      time: timeStr,
      userCode: log.user?.employeeCode ?? "—",
      action: actionLabels[log.action] ?? log.action,
      entity: log.entity,
      entityId: (log.entityId ?? "—").slice(0, 10),
      reason: log.reason ?? "—",
    };
  });

  // Generate printable HTML
  const html = `
<!DOCTYPE html>
<html lang="am">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>የዕለት ምርት ሪፖርት - ${dateLabel}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 15mm;
    }
    @page:first {
      size: A4 landscape;
    }
    @media print {
      body { margin: 0; }
      .page-break { page-break-before: always; }
      @page { size: A4 portrait; }
      .landscape { size: A4 landscape; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 9pt;
      color: #1a1a1a;
      line-height: 1.3;
    }
    .page {
      padding: 20px;
      background: white;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #333;
    }
    .header-left h1 {
      font-size: 14pt;
      margin-bottom: 4px;
    }
    .header-left .meta, .header-right .meta {
      font-size: 8pt;
      color: #666;
    }
    .header-right {
      text-align: right;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
    }
    thead {
      background: #f3f4f6;
      font-weight: bold;
    }
    th, td {
      border: 0.5pt solid #d1d5db;
      padding: 4px 6px;
      text-align: left;
    }
    th.center, td.center {
      text-align: center;
    }
    tbody tr:nth-child(even) {
      background: #fafafa;
    }
    tfoot {
      background: #eff6ff;
      font-weight: bold;
      border-top: 2pt solid #93c5fd;
    }
    .positive { color: #059669; }
    .negative { color: #dc2626; }
    .footer {
      margin-top: 10px;
      font-size: 7pt;
      color: #6b7280;
      text-align: right;
    }
    .audit-page {
      padding: 24px;
    }
    .audit-title {
      font-size: 13pt;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .audit-meta {
      font-size: 8pt;
      color: #666;
      margin-bottom: 12px;
    }
    .no-audit {
      padding: 20px;
      text-align: center;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <!-- Page 1: Production Sheet (Landscape) -->
  <div class="page landscape">
    <div class="header">
      <div class="header-left">
        <h1>የሠራተኞች ዕለታዊ ምርት ሰሌዳ</h1>
        <div class="meta">ቀን: ${dateLabel}  |  ሺፍት: ቀን  |  ሱፐርቫይዘር: ${session.user.nameAm ?? "—"}</div>
      </div>
      <div class="header-right">
        <div class="meta">ጠቅላላ ያደረሱ: ${totalProduced.toLocaleString()}</div>
        <div class="meta">ከዒላማ በላይ: ${aboveTarget} / ${rows.length}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="center" style="width: 4%;">ተ.ቁ.</th>
          <th style="width: 18%;">ሙሉ ስም</th>
          <th style="width: 16%;">ሥራ</th>
          <th style="width: 12%;">ማሽን</th>
          <th class="center" style="width: 10%;">ዒላማ/ቀን</th>
          <th class="center" style="width: 10%;">አደረሱ</th>
          <th class="center" style="width: 10%;">ልዩነት</th>
          <th class="center" style="width: 8%;">%</th>
          <th style="width: 12%;">ፊርማ</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
        <tr>
          <td class="center">${row.serial}</td>
          <td>${row.nameAm}</td>
          <td>${row.operationAm}</td>
          <td>${row.machineType}</td>
          <td class="center">${row.targetPerDay > 0 ? row.targetPerDay : "—"}</td>
          <td class="center"><strong>${row.produced}</strong></td>
          <td class="center ${row.diff >= 0 ? 'positive' : 'negative'}">
            ${row.diff > 0 ? `+${row.diff}` : row.diff < 0 ? row.diff : "—"}
          </td>
          <td class="center ${row.pct >= 100 ? 'positive' : 'negative'}">
            ${row.targetPerDay > 0 ? `${row.pct}%` : "—"}
          </td>
          <td></td>
        </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td></td>
          <td colspan="4">ድምር</td>
          <td class="center"><strong>${totalProduced.toLocaleString()}</strong></td>
          <td></td>
          <td class="center">${rows.length > 0 ? `${aboveTarget}/${rows.length}` : "—"}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <div class="footer">
      ዒላማ = በሰዓት ዒላማ × 8 ሰዓቶች  |  ልዩነት = ያደረሱ − ዒላማ  |  ገጽ 1
    </div>
  </div>

  <!-- Page 2: Audit Log (Portrait) -->
  <div class="page audit-page page-break">
    <div class="audit-title">የዕለት የሥርዓት ምዝገባ (Audit Log)</div>
    <div class="audit-meta">ቀን: ${dateLabel}  |  ጠቅላላ ምዝገቦች: ${auditRows.length}</div>

    ${auditRows.length === 0 ? `
      <div class="no-audit">ዛሬ ምንም የሥርዓት ምዝገባ አልተካሄደም</div>
    ` : `
      <table>
        <thead>
          <tr>
            <th style="width: 12%;">ሰዓት</th>
            <th style="width: 12%;">ተጠቃሚ</th>
            <th style="width: 24%;">ድርጊት</th>
            <th style="width: 22%;">ዓይነት / መለያ</th>
            <th style="width: 30%;">ማብራሪያ</th>
          </tr>
        </thead>
        <tbody>
          ${auditRows.map((row, idx) => `
          <tr>
            <td>${row.time}</td>
            <td><strong>${row.userCode}</strong></td>
            <td>${row.action}</td>
            <td>${row.entity} / ${row.entityId}</td>
            <td>${row.reason}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    `}

    <div class="footer" style="margin-top: 16px;">
      ገጽ 2  |  ይህ ሰነድ ራስ-ሰር ተዘጋጅቷል  |  ${new Date().toLocaleDateString('am-ET')}
    </div>
  </div>

  <script>
    // Auto-open print dialog when loaded
    window.onload = () => {
      // Small delay to ensure styles are loaded
      setTimeout(() => window.print(), 500);
    };
  </script>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
