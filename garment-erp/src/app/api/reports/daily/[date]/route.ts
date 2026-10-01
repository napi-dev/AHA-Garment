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

  // Fetch attendance data
  const attendances = await db.attendance.findMany({
    where: { date },
    include: {
      employee: {
        include: {
          department: { select: { nameAm: true } },
        },
      },
    },
    orderBy: [
      { employee: { department: { sortOrder: "asc" } } },
      { employee: { serialNumber: "asc" } },
    ],
  });

  // Fetch salary records
  const salaryRecords = await db.salaryRecord.findMany({
    where: {
      employee: { isActive: true },
      effectiveFrom: { lte: date },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
    },
    include: {
      employee: {
        include: {
          department: { select: { nameAm: true } },
        },
      },
    },
    orderBy: [
      { employee: { department: { sortOrder: "asc" } } },
      { employee: { serialNumber: "asc" } },
    ],
  });

  // Fetch audit logs
  const auditLogs = await db.auditLog.findMany({
    where: { createdAt: { gte: date, lte: dayEnd } },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { employeeCode: true } } },
  });

  // Get incentive cards (for target AND rate)
  const cardMap = new Map<string, { target: number; rate: number }>();
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
    cardMap.set(deptId, {
      target: card?.targetPerHour ?? 0,
      rate: card?.ratePerPiece ?? 0,
    });
  }

  let totalProduced = 0;
  let aboveTarget = 0;
  let totalIncentive = 0;

  const rows = lines.map((line, idx) => {
    const cardData = cardMap.get(line.departmentId) ?? { target: 0, rate: 0 };
    const targetPerDay = cardData.target * 8;
    totalProduced += line.totalProduced;
    if (line.plusPieces > 0) aboveTarget++;
    const pct = targetPerDay > 0
      ? Math.round((line.totalProduced / targetPerDay) * 100 * 10) / 10
      : 0;
    const diff = line.plusPieces > 0 ? line.plusPieces : -line.minusPieces;
    
    // Calculate incentive: only use plusPieces (positive pieces) × rate
    const incentive = line.plusPieces > 0 ? line.plusPieces * cardData.rate : 0;
    totalIncentive += incentive;

    return {
      serial: idx + 1,
      nameAm: line.employee.nameAm,
      operationAm: line.sheet.operation.nameAm,
      machineType: line.department.nameEn ?? line.department.nameAm,
      targetPerDay,
      produced: line.totalProduced,
      diff,
      pct,
      rate: cardData.rate,
      incentive,
    };
  });

  // Prepare attendance rows
  const attendanceRows = attendances.map((att, idx) => {
    const hours = Number(att.hoursWorked);
    let status = "—";
    if (hours === -1) status = "ፈቃድ";
    else if (hours === 0) status = "ቅዳሜ/ዕረፍት";
    else if (hours > 0) status = "ተገኝቷል";

    return {
      serial: idx + 1,
      serialNumber: att.employee.serialNumber,
      nameAm: att.employee.nameAm,
      deptAm: att.employee.department?.nameAm ?? "—",
      hoursWorked: hours === -1 ? "—" : hours > 0 ? hours.toString() : "0",
      status,
    };
  });

  // Prepare salary rows
  const salaryRows = salaryRecords.map((sal, idx) => {
    return {
      serial: idx + 1,
      serialNumber: sal.employee.serialNumber,
      nameAm: sal.employee.nameAm,
      deptAm: sal.employee.department?.nameAm ?? "—",
      amount: sal.amount,
      effectiveFrom: sal.effectiveFrom.toLocaleDateString("am-ET"),
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

  // Generate printable HTML with 4 pages
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
    @media print {
      body { margin: 0; }
      .page-break { page-break-before: always; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 8.5pt;
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
      font-size: 13pt;
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
      font-size: 7.5pt;
    }
    thead {
      background: #f3f4f6;
      font-weight: bold;
    }
    th, td {
      border: 0.5pt solid #d1d5db;
      padding: 3px 5px;
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
    .amber { color: #d97706; }
    .footer {
      margin-top: 10px;
      font-size: 7pt;
      color: #6b7280;
      text-align: right;
    }
    .no-data {
      padding: 20px;
      text-align: center;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <!-- Page 1: Production Sheet with Rate & Incentive (Landscape) -->
  <div class="page">
    <div class="header">
      <div class="header-left">
        <h1>የሠራተኞች ዕለታዊ ምርት ሰሌዳ</h1>
        <div class="meta">ቀን: ${dateLabel}  |  ሺፍት: ቀን  |  ሱፐርቫይዘር: ${session.user.nameAm ?? "—"}</div>
      </div>
      <div class="header-right">
        <div class="meta">ጠቅላላ ያደረሱ: ${totalProduced.toLocaleString()}</div>
        <div class="meta">ከዒላማ በላይ: ${aboveTarget} / ${rows.length}</div>
        <div class="meta">ጠቅላላ ኢንሴንቲቭ: ${totalIncentive.toFixed(2)} ብር</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="center" style="width: 3%;">ተ.ቁ.</th>
          <th style="width: 15%;">ሙሉ ስም</th>
          <th style="width: 13%;">ሥራ</th>
          <th style="width: 10%;">ማሽን</th>
          <th class="center" style="width: 8%;">ዒላማ/ቀን</th>
          <th class="center" style="width: 8%;">አደረሱ</th>
          <th class="center" style="width: 8%;">ልዩነት</th>
          <th class="center" style="width: 6%;">%</th>
          <th class="center" style="width: 9%;">በፍሬ ተመን<br/>(ብር/ፍሬ)</th>
          <th class="center" style="width: 10%;">ኢንሴንቲቭ<br/>(ብር)</th>
          <th style="width: 10%;">ፊርማ</th>
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
          <td class="center">${row.rate > 0 ? row.rate.toFixed(2) : "—"}</td>
          <td class="center ${row.incentive > 0 ? 'positive' : ''}">
            <strong>${row.incentive > 0 ? row.incentive.toFixed(2) : "0.00"}</strong>
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
          <td class="center"><strong>${totalIncentive.toFixed(2)}</strong></td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <div class="footer">
      ኢንሴንቲቭ = ትርፍ ፍሬዎች × በፍሬ ተመን  |  ልዩነት = ያደረሱ − ዒላማ  |  ገጽ 1/4
    </div>
  </div>

  <!-- Page 2: Attendance (Landscape) -->
  <div class="page page-break">
    <div class="header">
      <div class="header-left">
        <h1>የዕለት መገኘት ሰሌዳ</h1>
        <div class="meta">ቀን: ${dateLabel}  |  የተመዘገቡ: ${attendanceRows.length} ሰዎች</div>
      </div>
      <div class="header-right">
        <div class="meta">ተገኝተዋል: ${attendanceRows.filter(a => a.status === "ተገኝቷል").length}</div>
        <div class="meta">ፈቃድ: ${attendanceRows.filter(a => a.status === "ፈቃድ").length}</div>
      </div>
    </div>

    ${attendanceRows.length === 0 ? `
      <div class="no-data">ለዚህ ቀን የመገኘት መረጃ አልተመዘገበም</div>
    ` : `
      <table>
        <thead>
          <tr>
            <th class="center" style="width: 6%;">ተ.ቁ.</th>
            <th class="center" style="width: 10%;">መታወቂያ</th>
            <th style="width: 30%;">ሙሉ ስም</th>
            <th style="width: 24%;">የሥራ ክፍል</th>
            <th class="center" style="width: 12%;">የሥራ ሰዓት</th>
            <th class="center" style="width: 18%;">ሁኔታ</th>
          </tr>
        </thead>
        <tbody>
          ${attendanceRows.map(att => `
          <tr>
            <td class="center">${att.serial}</td>
            <td class="center">${att.serialNumber}</td>
            <td>${att.nameAm}</td>
            <td>${att.deptAm}</td>
            <td class="center">${att.hoursWorked}</td>
            <td class="center ${att.status === "ተገኝቷል" ? "positive" : att.status === "ፈቃድ" ? "amber" : ""}">
              ${att.status}
            </td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    `}

    <div class="footer">
      ተገኝቷል = የሥራ ሰዓት > 0  |  ፈቃድ = በእገዳ ላይ  |  ቅዳሜ/ዕረፍት = 0 ሰዓት  |  ገጽ 2/4
    </div>
  </div>

  <!-- Page 3: Salary Records (Landscape) -->
  <div class="page page-break">
    <div class="header">
      <div class="header-left">
        <h1>የደሞዝ መረጃ ሰሌዳ</h1>
        <div class="meta">ቀን: ${dateLabel}  |  የተመዘገቡ: ${salaryRows.length} ሰዎች</div>
      </div>
      <div class="header-right">
        <div class="meta">ጠቅላላ ደሞዝ: ${salaryRows.reduce((sum, s) => sum + s.amount, 0).toLocaleString()} ብር</div>
      </div>
    </div>

    ${salaryRows.length === 0 ? `
      <div class="no-data">የደሞዝ መረጃ አልተገኘም</div>
    ` : `
      <table>
        <thead>
          <tr>
            <th class="center" style="width: 6%;">ተ.ቁ.</th>
            <th class="center" style="width: 12%;">መታወቂያ</th>
            <th style="width: 30%;">ሙሉ ስም</th>
            <th style="width: 24%;">የሥራ ክፍል</th>
            <th class="center" style="width: 14%;">ደሞዝ (ብር)</th>
            <th class="center" style="width: 14%;">ከ ቀን ጀምሮ</th>
          </tr>
        </thead>
        <tbody>
          ${salaryRows.map(sal => `
          <tr>
            <td class="center">${sal.serial}</td>
            <td class="center">${sal.serialNumber}</td>
            <td>${sal.nameAm}</td>
            <td>${sal.deptAm}</td>
            <td class="center"><strong>${sal.amount.toLocaleString()}</strong></td>
            <td class="center">${sal.effectiveFrom}</td>
          </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" class="center"><strong>ጠቅላላ ወርሃዊ ደሞዝ</strong></td>
            <td class="center"><strong>${salaryRows.reduce((sum, s) => sum + s.amount, 0).toLocaleString()}</strong></td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    `}

    <div class="footer">
      ይህ ቋሚ ደሞዝ ብቻ ነው። ኢንሴንቲቭ፣ ተቀናሽ እና ቅጣት ሌላ ይታሰባል  |  ገጽ 3/4
    </div>
  </div>

  <!-- Page 4: Audit Log (Portrait style but landscape page) -->
  <div class="page page-break">
    <div class="header">
      <div class="header-left">
        <h1>የዕለት የሥርዓት ምዝገባ (Audit Log)</h1>
        <div class="meta">ቀን: ${dateLabel}  |  ጠቅላላ ምዝገቦች: ${auditRows.length}</div>
      </div>
    </div>

    ${auditRows.length === 0 ? `
      <div class="no-data">ዛሬ ምንም የሥርዓት ምዝገባ አልተካሄደም</div>
    ` : `
      <table>
        <thead>
          <tr>
            <th style="width: 10%;">ሰዓት</th>
            <th style="width: 10%;">ተጠቃሚ</th>
            <th style="width: 22%;">ድርጊት</th>
            <th style="width: 20%;">ዓይነት / መለያ</th>
            <th style="width: 38%;">ማብራሪያ</th>
          </tr>
        </thead>
        <tbody>
          ${auditRows.map(row => `
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
      ገጽ 4/4  |  ይህ ሰነድ ራስ-ሰር ተዘጋጅቷል  |  ${new Date().toLocaleDateString('am-ET')}
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
