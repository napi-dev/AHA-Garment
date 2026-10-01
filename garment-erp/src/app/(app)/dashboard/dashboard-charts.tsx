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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 font-ethiopic text-base">
                  የባለፉት 14 ቀናት የምርት ሂደት
                </h2>
                <p className="text-sm text-slate-500 font-ethiopic">የተመረቱ ፍሬዎች እና የተገኙ ትርፍ ፍሬዎች</p>
              </div>
            </div>
          </div>

          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  angle={-45}
                  textAnchor="end"
                  tick={{ fontSize: 12, fill: "#64748b", fontFamily: "system-ui" }}
                  interval={0}
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: "#64748b" }} 
                  width={60}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.98)",
                    borderRadius: "0.75rem",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
                    border: "1px solid #e2e8f0",
                    fontSize: "13px",
                    padding: "12px",
                  }}
                  formatter={(v: number, name: string) => [
                    v.toLocaleString() + " ፍሬ",
                    name === "produced" ? "ጠቅላላ የተመረተ" : "+ትርፍ ፍሬ",
                  ]}
                />
                <Legend
                  formatter={(v) => v === "produced" ? "ጠቅላላ የተመረተ" : "+ትርፍ ፍሬ"}
                  wrapperStyle={{ fontSize: 13, paddingTop: 16 }}
                />
                <Line
                  type="monotone"
                  dataKey="produced"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 7 }}
                  name="produced"
                />
                <Line
                  type="monotone"
                  dataKey="plus"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  strokeDasharray="5 3"
                  dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6 }}
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BarChart3 size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 font-ethiopic text-base">
                  የዕለቱ የምርት አፈጻጸም በክፍል
                </h2>
                <p className="text-sm text-slate-500 font-ethiopic">የታቀደው ዒላማ ከትክክለኛው ምርት ጋር</p>
              </div>
            </div>
          </div>

          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  tick={{ fontSize: 12, fill: "#64748b", fontFamily: "system-ui" }}
                  interval={0}
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: "#64748b" }} 
                  width={60}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.98)",
                    borderRadius: "0.75rem",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
                    border: "1px solid #e2e8f0",
                    fontSize: "13px",
                    padding: "12px",
                  }}
                  formatter={(v: number, name: string) => [
                    v.toLocaleString() + " ፍሬ",
                    name === "produced" ? "የተመረተ" : "የታቀደ ዒላማ",
                  ]}
                />
                <Legend
                  formatter={(v) => v === "produced" ? "የተመረተ" : "የታቀደ ዒላማ"}
                  wrapperStyle={{ fontSize: 13, paddingTop: 16 }}
                />
                <Bar dataKey="target" fill="#cbd5e1" radius={[6, 6, 0, 0]} name="target" />
                <Bar dataKey="produced" fill="#4f46e5" radius={[6, 6, 0, 0]} name="produced" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
