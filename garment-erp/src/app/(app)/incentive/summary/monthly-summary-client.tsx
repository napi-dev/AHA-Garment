"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from "recharts";
import { am } from "@/lib/i18n/am";

interface SummaryRow {
  deptId: string;
  nameAm: string;
  workers: number;
  p1Calculated: string;
  p2Calculated: string;
  monthCalculated: string;
  monthPayable: string;
}

interface Props {
  rows: SummaryRow[];
  grandCalc: string;
  grandPay: string;
}

export function MonthlySummaryClient({ rows, grandCalc, grandPay }: Props) {
  // Chart data — use payable for the bar (matches sample PDF)
  const chartData = rows
    .filter((r) => parseFloat(r.monthPayable) > 0)
    .map((r) => ({
      name: r.nameAm,
      payable: parseFloat(r.monthPayable),
      calculated: parseFloat(r.monthCalculated),
    }));

  // Color bars: negative calculated = red tint
  const barColor = (calc: number) => (calc < 0 ? "#ef4444" : "#10b981");

  return (
    <div className="space-y-6">
      {/* Department table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm data-table">
          <thead>
            <tr>
              <th className="w-10">#</th>
              <th>{am.employees.department}</th>
              <th>ሠ.</th>
              <th>{am.incentive.period1} {am.incentive.calculated}</th>
              <th>{am.incentive.period2} {am.incentive.calculated}</th>
              <th>ወር {am.incentive.calculated}</th>
              <th>ወር {am.incentive.payable}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const mCalc = parseFloat(r.monthCalculated);
              const mPay  = parseFloat(r.monthPayable);
              return (
                <tr key={r.deptId}>
                  <td className="text-center text-gray-400 tabular-nums">{idx + 1}</td>
                  <td className="font-ethiopic text-gray-800">{r.nameAm}</td>
                  <td className="text-center tabular-nums text-gray-500">{r.workers}</td>
                  <td className={`tabular-nums ${parseFloat(r.p1Calculated) < 0 ? "text-red-600" : "text-gray-700"}`}>
                    {parseFloat(r.p1Calculated).toFixed(2)}
                  </td>
                  <td className={`tabular-nums ${parseFloat(r.p2Calculated) < 0 ? "text-red-600" : "text-gray-700"}`}>
                    {parseFloat(r.p2Calculated).toFixed(2)}
                  </td>
                  <td className={`tabular-nums font-medium ${mCalc < 0 ? "text-red-600" : "text-gray-800"}`}>
                    {mCalc.toFixed(2)}
                  </td>
                  <td className={`tabular-nums font-semibold ${mPay > 0 ? "text-emerald-700" : "text-gray-400"}`}>
                    {mPay.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-bold text-base">
              <td colSpan={5} className="p-3 text-right font-ethiopic text-gray-700">{am.total}</td>
              <td className="p-3 tabular-nums text-gray-900">{parseFloat(grandCalc).toFixed(2)}</td>
              <td className="p-3 tabular-nums text-emerald-700">{parseFloat(grandPay).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Bar chart — payable by department */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 font-ethiopic mb-4">
            ወርሃዊ ኢንሴንቲቭ በክፍል (ብር)
          </h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                tick={{ fontSize: 11, fontFamily: "var(--font-noto-sans-ethiopic)" }}
                interval={0}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)} ብር`, "ሊከፈል"]}
                labelStyle={{ fontFamily: "var(--font-noto-sans-ethiopic)" }}
              />
              <Legend
                formatter={() => "ሊከፈል (ብር)"}
                wrapperStyle={{ fontFamily: "var(--font-noto-sans-ethiopic)", fontSize: 12 }}
              />
              <Bar dataKey="payable" name="ሊከፈል (ብር)" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={barColor(entry.calculated)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
