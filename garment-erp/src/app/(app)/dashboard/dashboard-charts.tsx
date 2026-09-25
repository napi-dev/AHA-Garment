"use client";

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { Role } from "@prisma/client";
import { hasPermission } from "@/lib/auth/permissions";

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
    <div className="grid md:grid-cols-2 gap-6">
      {/* Production trend — last 14 days */}
      {hasProd && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 font-ethiopic mb-4">
            ባለፉት 14 ቀናት ምርት
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                angle={-45}
                textAnchor="end"
                tick={{ fontSize: 9, fontFamily: "var(--font-noto-sans-ethiopic)" }}
                interval={1}
              />
              <YAxis tick={{ fontSize: 10 }} width={45} />
              <Tooltip
                labelStyle={{ fontFamily: "var(--font-noto-sans-ethiopic)", fontSize: 11 }}
                formatter={(v: number, name: string) => [
                  v.toLocaleString(),
                  name === "produced" ? "ያደረሱ" : "+ፍሬ",
                ]}
              />
              <Legend
                formatter={(v) => v === "produced" ? "ያደረሱ" : "+ፍሬ"}
                wrapperStyle={{ fontFamily: "var(--font-noto-sans-ethiopic)", fontSize: 11 }}
              />
              <Line type="monotone" dataKey="produced" stroke="#3b82f6" strokeWidth={2}
                dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="plus" stroke="#10b981" strokeWidth={2}
                dot={{ r: 3 }} activeDot={{ r: 5 }} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Department productivity today */}
      {hasDept && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 font-ethiopic mb-4">
            ዛሬ ምርታማነት በክፍል
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptData} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                tick={{ fontSize: 9, fontFamily: "var(--font-noto-sans-ethiopic)" }}
                interval={0}
              />
              <YAxis tick={{ fontSize: 10 }} width={45} />
              <Tooltip
                labelStyle={{ fontFamily: "var(--font-noto-sans-ethiopic)", fontSize: 11 }}
                formatter={(v: number, name: string) => [
                  v.toLocaleString(),
                  name === "produced" ? "ያደረሱ" : "ዒላማ",
                ]}
              />
              <Legend
                formatter={(v) => v === "produced" ? "ያደረሱ" : "ዒላማ"}
                wrapperStyle={{ fontFamily: "var(--font-noto-sans-ethiopic)", fontSize: 11 }}
              />
              <Bar dataKey="target"   fill="#e5e7eb" radius={[3,3,0,0]} name="target" />
              <Bar dataKey="produced" fill="#3b82f6" radius={[3,3,0,0]} name="produced" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
