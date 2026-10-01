import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ethMonthName, formatAsEthDate } from "@/lib/ethiopian-calendar";
import Decimal from "decimal.js";

/**
 * GET /api/reports/monthly?year=2017&month=1
 * Returns a comprehensive monthly report with:
 * - Employee salary and incentive summary
 * - Attendance tracking (including Sundays as rest days)
 * - Total compensation breakdown
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const year = parseInt(searchParams.get("year") ?? "0");
  const month = parseInt(searchParams.get("month") ?? "0");

  if (!year || !month || month < 1 || month > 13) {
    return NextResponse.json(
      { error: "Invalid year or month parameters" },
      { status: 400 }
    );
  }

  // Fetch hourly count lines for the month (like the viewer pages do)
  const { dateToEth } = await import("@/lib/ethiopian-calendar");
  
  // Query all hourly count lines in a broad date range
  const allLines = await db.hourlyCountLine.findMany({
    where: {
      sheet: {
        date: {
          gte: new Date(new Date().getFullYear() - 1, 0, 1),
          lte: new Date(new Date().getFullYear() + 1, 11, 31),
        },
      },
      status: { not: "DRAFT" },
    },
    include: {
      employee: {
        include: {
          department: true,
          salaryRecords: {
            orderBy: { effectiveFrom: "desc" },
            take: 1,
          },
        },
      },
      sheet: {
        select: {
          date: true,
        },
      },
      department: true,
    },
  });

  // Filter by Ethiopian month/year
  const filteredLines = allLines.filter((line) => {
    const ethDate = dateToEth(line.sheet.date);
    return ethDate.year === year && ethDate.month === month;
  });

  if (filteredLines.length === 0) {
    return NextResponse.json(
      { error: "No data found for this month" },
      { status: 404 }
    );
  }

  // Get date range from filtered lines
  const dates = filteredLines.map((l) => l.sheet.date).sort((a, b) => a.getTime() - b.getTime());
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  // Aggregate by employee
  const employeeMap = new Map<string, any>();
  const employeeDataMap = new Map<string, {
    totalProduced: number;
    plusPieces: number;
    minusPieces: number;
    days: number;
    departmentId: string;
  }>();

  for (const line of filteredLines) {
    if (!employeeMap.has(line.employeeId)) {
      employeeMap.set(line.employeeId, line.employee);
    }

    const existing = employeeDataMap.get(line.employeeId);
    if (existing) {
      existing.totalProduced += line.totalProduced;
      existing.plusPieces += line.plusPieces;
      existing.minusPieces += line.minusPieces;
      existing.days += 1;
    } else {
      employeeDataMap.set(line.employeeId, {
        totalProduced: line.totalProduced,
        plusPieces: line.plusPieces,
        minusPieces: line.minusPieces,
        days: 1,
        departmentId: line.departmentId,
      });
    }
  }

  // Get incentive rates
  const deptIds = Array.from(new Set(Array.from(employeeDataMap.values()).map(e => e.departmentId)));
  const incentiveCards = await db.incentiveCard.findMany({
    where: {
      departmentId: { in: deptIds },
      effectiveFrom: { lte: endDate },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: startDate } }
      ]
    },
    orderBy: { effectiveFrom: "desc" },
  });

  const rateByDept = new Map<string, Decimal>();
  for (const card of incentiveCards) {
    if (!rateByDept.has(card.departmentId)) {
      rateByDept.set(card.departmentId, new Decimal(card.ratePerPiece.toString()));
    }
  }

  // Calculate incentives by employee (only from plusPieces)
  const incentiveByEmployee = new Map<string, Decimal>();
  for (const [empId, data] of employeeDataMap.entries()) {
    const rate = rateByDept.get(data.departmentId) ?? new Decimal(0);
    const incentive = data.plusPieces > 0 ? new Decimal(data.plusPieces).times(rate) : new Decimal(0);
    incentiveByEmployee.set(empId, incentive);
  }

  // Get attendance data for the month
  const attendanceData = await db.attendance.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      employeeId: { in: Array.from(employeeMap.keys()) },
    },
    orderBy: [{ employeeId: "asc" }, { date: "asc" }],
  });

  // Group attendance by employee
  const attendanceByEmployee = new Map<string, typeof attendanceData>();
  for (const att of attendanceData) {
    const existing = attendanceByEmployee.get(att.employeeId) ?? [];
    existing.push(att);
    attendanceByEmployee.set(att.employeeId, existing);
  }

  // Calculate total working days and Sundays in the period
  let totalDays = 0;
  let sundayCount = 0;
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    totalDays++;
    if (currentDate.getDay() === 0) {
      // Sunday
      sundayCount++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  const workingDays = totalDays - sundayCount;

  // Build employee rows
  let totalBaseSalary = new Decimal(0);
  let totalIncentive = new Decimal(0);
  let totalCompensation = new Decimal(0);

  const employees = Array.from(employeeMap.values()).sort((a, b) => {
    if (a.department.sortOrder !== b.department.sortOrder) {
      return a.department.sortOrder - b.department.sortOrder;
    }
    // Handle both string and number serialNumbers
    const aSerial = String(a.serialNumber);
    const bSerial = String(b.serialNumber);
    return aSerial.localeCompare(bSerial);
  });

  const rows = employees.map((emp, idx) => {
    const incentive = incentiveByEmployee.get(emp.id) ?? new Decimal(0);
    const baseSalary =
      emp.salaryRecords[0]?.amount
        ? new Decimal(emp.salaryRecords[0].amount.toString())
        : new Decimal(0);

    const attendances = attendanceByEmployee.get(emp.id) ?? [];
    // Present = hoursWorked > 0 (excluding leave which is -1)
    const presentDays = attendances.filter((a) => Number(a.hoursWorked) > 0).length;
    // Absent = hoursWorked = 0 (not counting leave = -1 or weekends)
    const absentDays = attendances.filter((a) => Number(a.hoursWorked) === 0).length;
    const missedDays = workingDays - presentDays;

    const total = baseSalary.plus(incentive);

    totalBaseSalary = totalBaseSalary.plus(baseSalary);
    totalIncentive = totalIncentive.plus(incentive);
    totalCompensation = totalCompensation.plus(total);

    return {
      serial: idx + 1,
      nameAm: emp.nameAm,
      employeeCode: emp.employeeCode ?? emp.serialNumber,
      deptAm: emp.department.nameAm,
      baseSalary: baseSalary.toFixed(2),
      incentive: incentive.toFixed(2),
      total: total.toFixed(2),
      presentDays,
      absentDays,
      missedDays,
      sundayCount,
      workingDays,
    };
  });

  const monthLabel = `${ethMonthName(month)} ${year} ዓ.ም`;
  const dateRange = `${formatAsEthDate(startDate)} እስከ ${formatAsEthDate(endDate)}`;

  const html = `
<!DOCTYPE html>
<html lang="am">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>የወር ክፍያ ሪፖርት - ${monthLabel}</title>
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
      font-size: 9pt;
      color: #1a1a1a;
      line-height: 1.3;
    }
    .page {
      padding: 20px;
      background: white;
      min-height: 297mm;
    }
    .header {
      text-align: center;
      margin-bottom: 16px;
      padding-bottom: 10px;
      border-bottom: 2px solid #333;
    }
    .header h1 {
      font-size: 16pt;
      margin-bottom: 6px;
      font-weight: bold;
    }
    .header .meta {
      font-size: 9pt;
      color: #666;
      margin-top: 4px;
    }
    .summary-boxes {
      display: flex;
      justify-content: space-around;
      margin: 16px 0;
      gap: 12px;
    }
    .summary-box {
      flex: 1;
      border: 1.5pt solid #3b82f6;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
      background: #eff6ff;
    }
    .summary-box .label {
      font-size: 8pt;
      color: #666;
      margin-bottom: 4px;
    }
    .summary-box .value {
      font-size: 13pt;
      font-weight: bold;
      color: #1e40af;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      margin-top: 12px;
    }
    thead {
      background: #1e293b;
      color: white;
      font-weight: bold;
    }
    th, td {
      border: 0.5pt solid #cbd5e1;
      padding: 6px 8px;
      text-align: left;
    }
    th.center, td.center {
      text-align: center;
    }
    th.right, td.right {
      text-align: right;
    }
    tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    tbody tr:hover {
      background: #f1f5f9;
    }
    tfoot {
      background: #dbeafe;
      font-weight: bold;
      border-top: 2pt solid #3b82f6;
      font-size: 9pt;
    }
    .positive { color: #059669; }
    .negative { color: #dc2626; }
    .footer {
      margin-top: 16px;
      font-size: 7pt;
      color: #64748b;
      text-align: center;
      border-top: 1pt solid #e2e8f0;
      padding-top: 8px;
    }
    .signature-section {
      margin-top: 32px;
      display: flex;
      justify-content: space-between;
      gap: 20px;
    }
    .signature-box {
      text-align: center;
      flex: 1;
    }
    .signature-line {
      border-top: 1pt solid #333;
      margin-top: 50px;
      padding-top: 6px;
      font-size: 8pt;
    }
    .info-note {
      background: #fef3c7;
      border: 1pt solid #fbbf24;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 8pt;
      margin-top: 12px;
      color: #78350f;
    }
  </style>
</head>
<body>
  <!-- Page 1: Comprehensive Monthly Report -->
  <div class="page">
    <div class="header">
      <h1>AHA GARMENT</h1>
      <h1>የወር ጠቅላላ ክፍያ ሪፖርት</h1>
      <div class="meta">${monthLabel}</div>
      <div class="meta">${dateRange}</div>
    </div>

    <div class="summary-boxes">
      <div class="summary-box">
        <div class="label">ጠቅላላ ቋሚ ደሞዝ</div>
        <div class="value">${totalBaseSalary.toFixed(2)} ብር</div>
      </div>
      <div class="summary-box">
        <div class="label">ጠቅላላ ኢንሴንቲቭ</div>
        <div class="value">${totalIncentive.toFixed(2)} ብር</div>
      </div>
      <div class="summary-box">
        <div class="label">ጠቅላላ ክፍያ</div>
        <div class="value">${totalCompensation.toFixed(2)} ብር</div>
      </div>
      <div class="summary-box">
        <div class="label">ሠራተኞች</div>
        <div class="value">${rows.length}</div>
      </div>
    </div>

    <div class="info-note">
      <strong>ማስታወሻ:</strong> የስራ ቀናት = ${workingDays} ቀናት (${totalDays} ቀናት − ${sundayCount} እሁዶች) | እሁድ = የእረፍት ቀን
    </div>

    <table>
      <thead>
        <tr>
          <th class="center" rowspan="2" style="width: 3%;">ተ.ቁ.</th>
          <th rowspan="2" style="width: 16%;">ሙሉ ስም</th>
          <th rowspan="2" style="width: 10%;">የሠራተኛ ኮድ</th>
          <th rowspan="2" style="width: 12%;">ክፍል</th>
          <th class="right" rowspan="2" style="width: 10%;">ቋሚ ደሞዝ<br/>(ብር)</th>
          <th class="right" rowspan="2" style="width: 10%;">ኢንሴንቲቭ<br/>(ብር)</th>
          <th class="right" rowspan="2" style="width: 10%;">ጠቅላላ<br/>(ብር)</th>
          <th class="center" colspan="4" style="background: #475569;">መገኘት (Attendance)</th>
          <th rowspan="2" style="width: 8%;">ፊርማ</th>
        </tr>
        <tr>
          <th class="center" style="width: 6%; background: #475569;">ተገኝቶ</th>
          <th class="center" style="width: 6%; background: #475569;">ያልተገኘ</th>
          <th class="center" style="width: 6%; background: #475569;">የሳምንት<br/>እረፍት</th>
          <th class="center" style="width: 6%; background: #475569;">የስራ<br/>ቀናት</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
        <tr>
          <td class="center">${row.serial}</td>
          <td><strong>${row.nameAm}</strong></td>
          <td>${row.employeeCode}</td>
          <td>${row.deptAm}</td>
          <td class="right">${row.baseSalary}</td>
          <td class="right positive"><strong>${row.incentive !== "0.00" ? row.incentive : "—"}</strong></td>
          <td class="right" style="background: #f0f9ff;"><strong>${row.total}</strong></td>
          <td class="center positive">${row.presentDays}</td>
          <td class="center ${row.missedDays > 0 ? "negative" : ""}">${row.missedDays > 0 ? row.missedDays : "—"}</td>
          <td class="center" style="background: #f1f5f9;">${row.sundayCount}</td>
          <td class="center" style="background: #f1f5f9;">${row.workingDays}</td>
          <td></td>
        </tr>
        `
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="right"><strong>ጠቅላላ ድምር:</strong></td>
          <td class="right"><strong>${totalBaseSalary.toFixed(2)} ብር</strong></td>
          <td class="right"><strong>${totalIncentive.toFixed(2)} ብር</strong></td>
          <td class="right" style="background: #bfdbfe;"><strong>${totalCompensation.toFixed(2)} ብር</strong></td>
          <td class="center"><strong>${rows.reduce((sum, r) => sum + r.presentDays, 0)}</strong></td>
          <td class="center"><strong>${rows.reduce((sum, r) => sum + r.missedDays, 0)}</strong></td>
          <td colspan="2"></td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line">የሂሳብ ሀላፊ<br/>ስም እና ፊርማ</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">የሰው ሀብት ሀላፊ<br/>ስም እና ፊርማ</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">የአስተዳዳሪ<br/>ስም እና ፊርማ</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">የጄኔራል ማኔጀር<br/>ስም እና ፊርማ</div>
      </div>
    </div>

    <div class="footer">
      የወር ክፍያ ሪፖርት — ${monthLabel} | ጠቅላላ ክፍያ = ቋሚ ደሞዝ + ኢንሴንቲቭ | ይህ ሰነድ በራስ-ሰር ተዘጋጅቷል | ${new Date().toLocaleDateString("am-ET")}
    </div>
  </div>

  <script>
    window.onload = () => {
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
