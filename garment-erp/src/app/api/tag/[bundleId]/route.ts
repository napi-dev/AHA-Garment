/**
 * GET /api/tag/[bundleId]
 *
 * Returns a print-ready HTML page with:
 *   - Bundle code (large, scannable font)
 *   - QR code (generated as inline SVG — no external service, no network)
 *   - Style name (Amharic)
 *   - Order number
 *   - Quantity
 *   - Date (Ethiopian)
 *
 * Open in a browser tab and Ctrl+P to print, or embed in an iframe for preview.
 * No auth required so the tag can be opened from a tablet without re-login,
 * but the bundle ID is a cuid (unguessable).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import { generateQR } from "@/lib/qr";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bundleId: string }> }
) {
  const { bundleId } = await params;

  const bundle = await db.bundle.findUnique({
    where: { id: bundleId },
    include: {
      cutJob: {
        include: { order: { include: { style: true } } },
      },
    },
  });

  if (!bundle) {
    return new NextResponse("Bundle not found", { status: 404 });
  }

  const order   = bundle.cutJob.order;
  const style   = order.style;
  const dateStr = formatAsEthDate(bundle.createdAt);
  const qrSvg   = await generateQR(bundle.bundleCode);

  const html = `<!DOCTYPE html>
<html lang="am">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tag — ${bundle.bundleCode}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Ethiopic:wght@400;700&family=Noto+Sans:wght@400;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Noto Sans', 'Noto Sans Ethiopic', sans-serif;
      background: white;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 16px;
    }

    .tag {
      width: 90mm;
      border: 2px solid #1a1a1a;
      border-radius: 8px;
      padding: 12px;
      page-break-inside: avoid;
    }

    .header {
      text-align: center;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }

    .header h1 {
      font-size: 11px;
      color: #6b7280;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .header h2 {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #111;
      margin-top: 4px;
      font-family: 'Noto Sans', monospace;
    }

    .qr {
      display: flex;
      justify-content: center;
      margin: 10px 0;
    }

    .qr svg {
      width: 55mm;
      height: 55mm;
    }

    .info {
      font-size: 12px;
      line-height: 1.7;
    }

    .info table {
      width: 100%;
      border-collapse: collapse;
    }

    .info td {
      padding: 3px 4px;
    }

    .info td:first-child {
      color: #6b7280;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      width: 30%;
    }

    .info td:last-child {
      font-weight: 700;
      color: #111;
    }

    .style-name {
      font-family: 'Noto Sans Ethiopic', sans-serif;
    }

    .quantity {
      font-size: 18px;
      color: #2563eb;
    }

    .footer {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 9px;
      color: #9ca3af;
    }

    @media print {
      body { padding: 0; }
      .tag { border-radius: 0; page-break-inside: avoid; }
      @page { size: 90mm 140mm; margin: 4mm; }
    }
  </style>
</head>
<body>
  <div class="tag">
    <div class="header">
      <h1>ልብስ ፋብሪካ ሥርዓት</h1>
      <h2>${bundle.bundleCode}</h2>
    </div>

    <div class="qr">
      ${qrSvg}
    </div>

    <div class="info">
      <table>
        <tr>
          <td>ስታይል</td>
          <td class="style-name">${style.nameAm}</td>
        </tr>
        <tr>
          <td>ትዕዛዝ</td>
          <td>${order.orderNumber}</td>
        </tr>
        <tr>
          <td>ፍሬዎች</td>
          <td class="quantity">${bundle.quantity.toLocaleString()}</td>
        </tr>
        <tr>
          <td>ቀን</td>
          <td class="style-name">${dateStr}</td>
        </tr>
        ${order.customer ? `<tr><td>ደምበኛ</td><td>${order.customer}</td></tr>` : ""}
      </table>
    </div>

    <div class="footer">
      ID: ${bundle.id.slice(-12).toUpperCase()}
    </div>
  </div>

  <script>
    // Auto-print when opened directly (not in iframe)
    if (window.self === window.top) {
      window.addEventListener('load', () => window.print());
    }
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
