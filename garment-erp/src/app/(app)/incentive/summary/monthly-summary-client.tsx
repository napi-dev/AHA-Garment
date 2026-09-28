"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from "recharts";
import { am } from "@/lib/i18n/am";
import { BarChart3, Building2 } from "lucide-react";

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
  const chartData = rows
    .filter((r) => parseFloat(r.monthPayable) > 0)
    .map((r) => ({
      name: r.nameAm,
      payable: parseFloat(r.monthPayable),
      calculated: parseFloat(r.monthCalculated),
    }));

  const barColor = (calc: number) => (calc < 0 ? "#f43f5e" : "#10b981");

  return (
    <div className="space-y-6">
      {/* Department Table */}
      <div className="erp-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <Building2 size={16} className="text-slate-500" />
          <h2 className="font-bold text-slate-800 text-sm font-ethiopic">
            የክፍሎች የኢንሴንቲቭ ክፍያ ማጠቃለያ ሰንጠረዥ
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead>
              <tr>
                <th className="w-10 text-center">#</th>
                <th className="text-right">{am.employees.department}</th>
                <th className="text-center">የሠራተኛ ብዛት</th>
                <th className="text-right">{am.incentive.period1} የተሰላ</th>
                <th className="text-right">{am.incentive.period2} የተሰላ</th>
                <th className="text-right">የወሩ የተሰላ ድምር</th>
                <th className="text-right">የወሩ የሚከፈል የተጣራ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const mCalc = parseFloat(r.monthCalculated);
                const mPay  = parseFloat(r.monthPayable);
                return (
                  <tr key={r.deptId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="text-center text-slate-400 tabular-nums py-3">{idx + 1}</td>
                    <td className="font-ethiopic font-semibold text-slate-900 text-right py-3">{r.nameAm}</td>
                    <td className="text-center tabular-nums text-slate-600 font-medium py-3">{r.workers}</td>
                    <td className={`tabular-nums text-right py-3 ${parseFloat(r.p1Calculated) < 0 ? "text-rose-600 font-semibold" : "text-slate-700"}`}>
                      {parseFloat(r.p1Calculated).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`tabular-nums text-right py-3 ${parseFloat(r.p2Calculated) < 0 ? "text-rose-600 font-semibold" : "text-slate-700"}`}>
                      {parseFloat(r.p2Calculated).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`tabular-nums font-semibold text-right py-3 ${mCalc < 0 ? "text-rose-600" : "text-slate-800"}`}>
                      {mCalc.toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`tabular-nums font-bold text-right py-3 ${mPay > 0 ? "text-emerald-700" : "text-slate-400"}`}>
                      {mPay.toLocaleString("en-ET", { minimumFractionDigits: 2 })} ብር
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                <td colSpan={5} className="p-4 text-right font-ethiopic text-slate-800 text-base">
                  {am.total} የፋብሪካው ጠቅላላ ድምር፦
                </td>
                <td className="p-4 tabular-nums text-right text-base text-slate-800">
                  {parseFloat(grandCalc).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                </td>
                <td className="p-4 tabular-nums text-right text-base text-emerald-700">
                  {parseFloat(grandPay).toLocaleString("en-ET", { minimumFractionDigits: 2 })} ብር
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Bar Chart Card */}
      {chartData.length > 0 && (
        <div className="erp-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-emerald-600" />
            <h2 className="font-bold text-slate-800 font-ethiopic text-sm">
              ወርሃዊ የሚከፈል ኢንሴንቲቭ በክፍል ንጽጽር (ብር)
            </h2>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 10, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="name"
                angle={-35}
                textAnchor="end"
                tick={{ fontSize: 11, fontFamily: "var(--font-noto-sans-ethiopic)", fill: "#64748b" }}
                interval={0}
              />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip
                formatter={(value: number) => [`${value.toLocaleString("en-ET", { minimumFractionDigits: 2 })} ብር`, "የሚከፈል"]}
                labelStyle={{ fontFamily: "var(--font-noto-sans-ethiopic)", fontWeight: 600 }}
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
              />
              <Legend
                formatter={() => "የሚከፈል የተጣራ ኢንሴንቲቭ (ብር)"}
                wrapperStyle={{ fontFamily: "var(--font-noto-sans-ethiopic)", fontSize: 12, paddingTop: 10 }}
              />
              <Bar dataKey="payable" name="የሚከፈል (ብር)" radius={[6, 6, 0, 0]}>
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
