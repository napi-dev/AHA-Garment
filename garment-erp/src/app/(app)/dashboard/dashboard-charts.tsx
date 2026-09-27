"use client";

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { Role } from "@prisma/client";
import { TrendingUp, BarChart3 } from "lucide-react";

interface TrendPoint { date: string; produced: number; plus: number; }
interface DeptPoint  { name: string; target: number; produced: number; }

interface Props {
  trendData: TrendPoint[];
  deptData:  DeptPoint[];
  role:      Role;
}

export function DashboardCharts({ trendData, deptData, role }: Props) {
  const hasProd = trendData.some((d) => d.produced > 0);
  const hasDept = deptData.length > 0;

  if (!hasProd && !hasDept) return null;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Production trend — last 14 days */}
      {hasProd && (
        <div className="erp-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 font-ethiopic text-sm">
                  የባለፉት 14 ቀናት የምርት ሂደት (Trend)
                </h2>
                <p className="text-xs text-slate-400 font-ethiopic">የተመረቱ ፍሬዎች እና የተገኙ ትርፍ ፍሬዎች</p>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 45 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  angle={-35}
                  textAnchor="end"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  interval={1}
                />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} width={45} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    borderRadius: "0.75rem",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                  formatter={(v: number, name: string) => [
                    v.toLocaleString() + " ፍሬ",
                    name === "produced" ? "ጠቅላላ የተመረተ" : "+ትርፍ ፍሬ",
                  ]}
                />
                <Legend
                  formatter={(v) => v === "produced" ? "ጠቅላላ የተመረተ" : "+ትርፍ ፍሬ"}
                  wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                />
                <Line
                  type="monotone"
                  dataKey="produced"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#2563eb" }}
                  activeDot={{ r: 6 }}
                  name="produced"
                />
                <Line
                  type="monotone"
                  dataKey="plus"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={{ r: 3, fill: "#10b981" }}
                  activeDot={{ r: 5 }}
                  name="plus"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Department productivity today */}
      {hasDept && (
        <div className="erp-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BarChart3 size={18} />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 font-ethiopic text-sm">
                  የዕለቱ የምርት አፈጻጸም በክፍል
                </h2>
                <p className="text-xs text-slate-400 font-ethiopic">የታቀደው ዒላማ ከትክክለኛው ምርት ጋር</p>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ top: 10, right: 10, left: -10, bottom: 45 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  angle={-35}
                  textAnchor="end"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} width={45} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    borderRadius: "0.75rem",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                  formatter={(v: number, name: string) => [
                    v.toLocaleString() + " ፍሬ",
                    name === "produced" ? "የተመረተ" : "የታቀደ ዒላማ",
                  ]}
                />
                <Legend
                  formatter={(v) => v === "produced" ? "የተመረተ" : "የታቀደ ዒላማ"}
                  wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                />
                <Bar dataKey="target" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="target" />
                <Bar dataKey="produced" fill="#4f46e5" radius={[4, 4, 0, 0]} name="produced" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
