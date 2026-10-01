import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatAsEthDate, ethMonthName } from "@/lib/ethiopian-calendar";
import Decimal from "decimal.js";

/**
 * GET /api/reports/incentive/[id]
 * Returns a printable HTML report for incentive period with:
 * - Page 1: Production & Incentive data
 * - Page 2: Attendance data
 * - Page 3: Salary data
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Fetch incentive period with all related data
  const period = await db.incentivePeriod.findUnique({
    where: { id },
    include: {
      lines: {
        include: {
          employee: { 
            include: { 
              department: true,
              salaryRecords: {
                where: {
                  effectiveFrom: { lte: new Date() },
                  OR: [
                    { effectiveTo: null },
                    { effectiveTo: { gte: new Date() } }
                  ]
                },
                orderBy: { effectiveFrom: "desc" },
                take: 1
              }
            } 
          },
          card: true,
        },
        orderBy: [
          { employee: { department: { sortOrder: "asc" } } },
          { employee: { serialNumber: "asc" } }
        ],
      },
    },
  });

  if (!period) {
    return NextResponse.json({ error: "Period not found" }, { status: 404 });
  }

  // Fetch attendance data for the period
  const attendanceData = await db.attendance.findMany({
    where: {
      date: { gte: period.startDate, lte: period.endDate },
      employeeId: { in: period.lines.map(l => l.employeeId) }
    },
    include: {
      employee: true
    },
    orderBy: [
      { employee: { serialNumber: "asc" } },
      { date: "asc" }
    ]
  });

  // Group attendance by employee
  const attendanceByEmployee = new Map<string, typeof attendanceData>();
  for (const att of attendanceData) {
    const existing = attendanceByEmployee.get(att.employeeId) ?? [];
    existing.push(att);
    attendanceByEmployee.set(att.employeeId, existing);
  }

  // Calculate totals
  let totalIncentive = new Decimal(0);
  let totalSalary = new Decimal(0);
  
  const rows = period.lines.map((line, idx) => {
    const ratePerPiece = parseFloat(line.ratePerPiece.toString());
    const diff = line.plusPieces - line.minusPieces;
    
    // Calculate incentive: only for positive difference
    let incentive = 0;
    if (diff > 0) {
      incentive = diff * ratePerPiece;
    }
    
    const payable = parseFloat(line.payable.toString());
    totalIncentive = totalIncentive.plus(new Decimal(payable));

    // Get salary
    const currentSalary = line.employee.salaryRecords[0];
    const baseSalary = currentSalary ? parseFloat(currentSalary.amount.toString()) : 0;
    totalSalary = totalSalary.plus(new Decimal(baseSalary));

    // Get attendance count
    const attendances = attendanceByEmployee.get(line.employeeId) ?? [];
    const presentDays = attendances.filter(a => {
      const hours = Number(a.hoursWorked.toString());
      return hours > 0;
    }).length;
    const absentDays = attendances.filter(a => {
      const hours = Number(a.hoursWorked.toString());
      return hours === 0;
    }).length;

    return {
      serial: idx + 1,
      nameAm: line.employee.nameAm,
      deptAm: line.employee.department.nameAm,
      ratePerPiece: ratePerPiece.toFixed(4),
      targetPerDay: line.card.targetPerHour * 8,
      plusPieces: line.plusPieces,
      minusPieces: line.minusPieces,
      diff,
      pct: line.card.targetPerHour > 0 
        ? Math.round(((line.plusPieces + line.minusPieces) / (line.card.targetPerHour * 8)) * 100 * 10) / 10 
        : 0,
      incentive: incentive.toFixed(2),
      payable: payable.toFixed(2),
      isSuspended: line.isSuspended,
      baseSalary: baseSalary.toFixed(2),
      presentDays,
      absentDays,
      employeeCode: line.employee.employeeCode ?? line.employee.serialNumber
    };
  });

  const periodLabel = `${ethMonthName(period.ethMonth)} ${period.ethYear} ዓ.ም - ቀን ${period.paymentDay}`;
  const dateRange = `${formatAsEthDate(period.startDate)} እስከ ${formatAsEthDate(period.endDate)}`;

  const html = `
<!DOCTYPE html>
<html lang="am">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>የኢንሴንቲቭ ክፍያ ሪፖርት - ${periodLabel}</title>
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
    }
    .header .meta {
      font-size: 9pt;
      color: #666;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      margin-top: 12px;
    }
    thead {
      background: #f3f4f6;
      font-weight: bold;
    }
    th, td {
      border: 0.5pt solid #d1d5db;
      padding: 5px 6px;
      text-align: left;
    }
    th.center, td.center {
      text-align: center;
    }
    th.right, td.right {
      text-align: right;
    }
    tbody tr:nth-child(even) {
      background: #fafafa;
    }
    tfoot {
      background: #dbeafe;
      font-weight: bold;
      border-top: 2pt solid #3b82f6;
    }
    .positive { color: #059669; }
    .negative { color: #dc2626; }
    .suspended { background: #fee2e2; }
    .footer {
      margin-top: 12px;
      font-size: 7pt;
      color: #6b7280;
      text-align: center;
    }
    .signature-section {
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
    }
    .signature-box {
      text-align: center;
      min-width: 200px;
    }
    .signature-line {
      border-top: 1pt solid #333;
      margin-top: 40px;
      padding-top: 4px;
      font-size: 8pt;
    }
  </style>
</head>
<body>
  <!-- Page 1: Production & Incentive -->
  <div class="page">
    <div class="header">
      <h1>የሠራተኞች ኢንሴንቲቭ ክፍያ ሰሌዳ</h1>
      <div class="meta">${periodLabel}</div>
      <div class="meta">${dateRange}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="center" style="width: 3%;">ተ.ቁ.</th>
          <th style="width: 16%;">ሙሉ ስም</th>
          <th style="width: 11%;">ክፍል</th>
          <th class="center" style="width: 7%;">በፍሬ ተመን<br/>(ብር/ፍሬ)</th>
          <th class="center" style="width: 7%;">ዒላማ/ቀን</th>
          <th class="center" style="width: 6%;">አደረሱ</th>
          <th class="center" style="width: 7%;">ልዩነት</th>
          <th class="center" style="width: 5%;">%</th>
          <th class="right" style="width: 9%;">ኢንሴንቲቭ<br/>(ብር)</th>
          <th class="right" style="width: 9%;">የሚከፈል<br/>(ብር)</th>
          <th style="width: 10%;">ፊርማ</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
        <tr ${row.isSuspended ? 'class="suspended"' : ''}>
          <td class="center">${row.serial}</td>
          <td>${row.nameAm}</td>
          <td>${row.deptAm}</td>
          <td class="center">${row.ratePerPiece}</td>
          <td class="center">${row.targetPerDay}</td>
          <td class="center"><strong>${row.plusPieces + row.minusPieces}</strong></td>
          <td class="center ${row.diff >= 0 ? 'positive' : 'negative'}">
            ${row.diff > 0 ? `+${row.diff}` : row.diff < 0 ? row.diff : '—'}
          </td>
          <td class="center ${row.pct >= 100 ? 'positive' : 'negative'}">
            ${row.pct > 0 ? `${row.pct}%` : '—'}
          </td>
          <td class="right">${row.incentive !== '0.00' ? row.incentive : '—'}</td>
          <td class="right"><strong>${row.isSuspended ? 'ታግዷል' : row.payable}</strong></td>
          <td></td>
        </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="8" class="right"><strong>ጠቅላላ ድምር:</strong></td>
          <td class="right"><strong>—</strong></td>
          <td class="right"><strong>${totalIncentive.toFixed(2)} ብር</strong></td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line">የአስተዳዳሪ ስም እና ፊርማ</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">የሂሳብ ሀላፊ ስም እና ፊርማ</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">የጄኔራል ማኔጀር ስም እና ፊርማ</div>
      </div>
    </div>

    <div class="footer">
      ገጽ 1 — የምርት ኢንሴንቲቭ  |  ልዩነት = አደረሱ − ዒላማ  |  ኢንሴንቲቭ = ልዩነት × በፍሬ ተመን (ለአዎንታ ልዩነት ብቻ)
    </div>
  </div>

  <!-- Page 2: Attendance Summary -->
  <div class="page page-break">
    <div class="header">
      <h1>የሠራተኞች መገኘት ሪፖርት</h1>
      <div class="meta">${periodLabel}</div>
      <div class="meta">${dateRange}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="center" style="width: 5%;">ተ.ቁ.</th>
          <th style="width: 20%;">ሙሉ ስም</th>
          <th style="width: 12%;">የሠራተኛ ኮድ</th>
          <th style="width: 15%;">ክፍል</th>
          <th class="center" style="width: 10%;">የተገኙ ቀናት</th>
          <th class="center" style="width: 10%;">ያልተገኙ ቀናት</th>
          <th class="center" style="width: 10%;">ጠቅላላ ቀናት</th>
          <th style="width: 18%;">ማስታወሻ</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
        <tr>
          <td class="center">${row.serial}</td>
          <td>${row.nameAm}</td>
          <td>${row.employeeCode}</td>
          <td>${row.deptAm}</td>
          <td class="center positive"><strong>${row.presentDays}</strong></td>
          <td class="center ${row.absentDays > 0 ? 'negative' : ''}">
            ${row.absentDays > 0 ? row.absentDays : '—'}
          </td>
          <td class="center">${row.presentDays + row.absentDays}</td>
          <td></td>
        </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="right"><strong>ጠቅላላ:</strong></td>
          <td class="center"><strong>${rows.reduce((sum, r) => sum + r.presentDays, 0)}</strong></td>
          <td class="center"><strong>${rows.reduce((sum, r) => sum + r.absentDays, 0)}</strong></td>
          <td class="center"><strong>${rows.reduce((sum, r) => sum + r.presentDays + r.absentDays, 0)}</strong></td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line">የሰው ሀብት ሀላፊ ስም እና ፊርማ</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">የአስተዳዳሪ ስም እና ፊርማ</div>
      </div>
    </div>

    <div class="footer">
      ገጽ 2 — መገኘት ሪፖርት  |  የሚሰላው በወቅቱ ውስጥ ያሉ የስራ ቀናት ብቻ ነው
    </div>
  </div>

  <!-- Page 3: Salary Summary -->
  <div class="page page-break">
    <div class="header">
      <h1>የሠራተኞች ደሞዝ ሪፖርት</h1>
      <div class="meta">${periodLabel}</div>
      <div class="meta">${dateRange}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="center" style="width: 5%;">ተ.ቁ.</th>
          <th style="width: 22%;">ሙሉ ስም</th>
          <th style="width: 12%;">የሠራተኛ ኮድ</th>
          <th style="width: 15%;">ክፍል</th>
          <th class="right" style="width: 12%;">ቋሚ ደሞዝ<br/>(ብር)</th>
          <th class="right" style="width: 12%;">ኢንሴንቲቭ<br/>(ብር)</th>
          <th class="right" style="width: 12%;">ጠቅላላ<br/>(ብር)</th>
          <th style="width: 10%;">ፊርማ</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
        <tr ${row.isSuspended ? 'class="suspended"' : ''}>
          <td class="center">${row.serial}</td>
          <td>${row.nameAm}</td>
          <td>${row.employeeCode}</td>
          <td>${row.deptAm}</td>
          <td class="right">${row.baseSalary}</td>
          <td class="right">${row.isSuspended ? 'ታግዷል' : row.payable}</td>
          <td class="right"><strong>${row.isSuspended ? row.baseSalary : (parseFloat(row.baseSalary) + parseFloat(row.payable)).toFixed(2)}</strong></td>
          <td></td>
        </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="right"><strong>ጠቅላላ ድምር:</strong></td>
          <td class="right"><strong>${totalSalary.toFixed(2)} ብር</strong></td>
          <td class="right"><strong>${totalIncentive.toFixed(2)} ብር</strong></td>
          <td class="right"><strong>${totalSalary.plus(totalIncentive).toFixed(2)} ብር</strong></td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line">የሂሳብ ሀላፊ ስም እና ፊርማ</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">የካሽየር ስም እና ፊርማ</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">የጄኔራል ማኔጀር ስም እና ፊርማ</div>
      </div>
    </div>

    <div class="footer">
      ገጽ 3 — ደሞዝ እና ኢንሴንቲቭ  |  ይህ ሰነድ ራስ-ሰር ተዘጋጅቷል  |  ${new Date().toLocaleDateString('am-ET')}
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
