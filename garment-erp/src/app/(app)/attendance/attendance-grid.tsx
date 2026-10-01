"use client";

import { useState } from "react";
import { am } from "@/lib/i18n/am";
import { saveAttendance, bulkAttendance } from "./actions";
import { Check, Loader2, AlertCircle, Users, CheckCircle2, XCircle } from "lucide-react";

interface AttendanceRecord {
  id: string;
  hoursWorked: number;
  lineId: string;
}

interface EmpRow {
  id: string;
  serialNumber: number;
  nameAm: string;
  attendance: AttendanceRecord | null;
}

interface DeptGroup {
  id: string;
  nameAm: string;
  employees: EmpRow[];
}

interface AttendanceGridProps {
  departments: DeptGroup[];
  date: string;
  canEdit: boolean;
  userId: string;
}

type RowState = {
  hours: string;
  line: string;
  saving: boolean;
  saved: boolean;
  error: string;
};

const HOUR_OPTIONS = [
  { label: am.attendance.absent,   value: "0" },
  { label: "ፈቃድ (Leave)",         value: "-1" },
  { label: "4 ሰዓት",                value: "4" },
  { label: "5 ሰዓት",                value: "5" },
  { label: "6 ሰዓት",                value: "6" },
  { label: "7 ሰዓት",                value: "7" },
  { label: am.attendance.fullShift, value: "8" },
];

export function AttendanceGrid({ departments, date, canEdit, userId }: AttendanceGridProps) {
  // Build initial state
  const init: Record<string, RowState> = {};
  for (const d of departments) {
    for (const e of d.employees) {
      init[e.id] = {
        hours: e.attendance ? String(e.attendance.hoursWorked) : "8",
        line: e.attendance?.lineId ?? "",
        saving: false,
        saved: !!e.attendance,
        error: "",
      };
    }
  }
  const [rows, setRows] = useState<Record<string, RowState>>(init);
  const [bulkSaving, setBulkSaving] = useState(false);

  function update(empId: string, field: keyof RowState, value: string) {
    setRows((p) => ({ ...p, [empId]: { ...p[empId], [field]: value, saved: false } }));
  }

  async function save(empId: string) {
    const row = rows[empId];
    setRows((p) => ({ ...p, [empId]: { ...p[empId], saving: true, error: "" } }));
    try {
      await saveAttendance({
        date,
        employeeId: empId,
        hoursWorked: parseFloat(row.hours),
        lineId: row.line || null,
        enteredById: userId,
      });
      setRows((p) => ({ ...p, [empId]: { ...p[empId], saving: false, saved: true } }));
    } catch (e) {
      setRows((p) => ({
        ...p,
        [empId]: { ...p[empId], saving: false, error: e instanceof Error ? e.message : "ስህተት" },
      }));
    }
  }

  async function bulkSaveDept(deptId: string, hours: number) {
    const dept = departments.find((d) => d.id === deptId);
    if (!dept) return;
    setBulkSaving(true);
    const empIds = dept.employees.map((e) => e.id);
    try {
      await bulkAttendance({ date, employeeIds: empIds, hoursWorked: hours, enteredById: userId });
      setRows((p) => {
        const next = { ...p };
        for (const id of empIds) next[id] = { ...next[id], hours: String(hours), saved: true };
        return next;
      });
    } catch (_) {
      /* silent */
    }
    setBulkSaving(false);
  }

  return (
    <div className="space-y-6">
      {departments.map((dept) => {
        const presentCount = dept.employees.filter((e) => {
          const hours = rows[e.id]?.hours;
          return hours !== "0" && hours !== "-1";
        }).length;

        return (
          <div key={dept.id} className="erp-card overflow-hidden shadow-sm">
            {/* Dept Header with Bulk Actions */}
            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  <Users size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 font-ethiopic text-sm">
                    {dept.nameAm}
                  </h3>
                  <p className="text-xs text-slate-500 font-ethiopic mt-0.5">
                    የቀረቡ፦ <span className="font-semibold text-emerald-600">{presentCount}</span> / {dept.employees.length} ሠራተኞች
                  </p>
                </div>
              </div>

              {canEdit && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 font-ethiopic">የጋራ መመዝገቢያ፦</span>
                  <button
                    onClick={() => bulkSaveDept(dept.id, 8)}
                    disabled={bulkSaving}
                    className="inline-flex items-center gap-1.5 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-xl hover:bg-emerald-700 active:scale-95 transition-all font-ethiopic shadow-xs"
                  >
                    <CheckCircle2 size={13} />
                    <span>{am.attendance.fullShift}</span>
                  </button>
                  <button
                    onClick={() => bulkSaveDept(dept.id, 0)}
                    disabled={bulkSaving}
                    className="inline-flex items-center gap-1.5 text-xs bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl hover:bg-rose-100 active:scale-95 transition-all font-ethiopic shadow-xs"
                  >
                    <XCircle size={13} />
                    <span>{am.attendance.absent}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Attendance Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-white text-slate-500 font-ethiopic text-xs">
                    <th className="p-3.5 text-center font-medium w-16">{am.serialNumber}</th>
                    <th className="p-3.5 text-right font-medium">{am.employees.name}</th>
                    <th className="p-3.5 text-center font-medium w-48">{am.attendance.hoursWorked}</th>
                    <th className="p-3.5 text-center font-medium w-36">{am.attendance.line}</th>
                    <th className="p-3.5 text-center font-medium w-24">ሁኔታ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dept.employees.map((emp) => {
                    const row = rows[emp.id];
                    if (!row) return null;
                    const isAbsent = row.hours === "0";
                    const isLeave = row.hours === "-1";

                    return (
                      <tr
                        key={emp.id}
                        className={`transition-colors ${
                          isAbsent
                            ? "bg-rose-50/30"
                            : isLeave
                            ? "bg-amber-50/30"
                            : row.saved
                            ? "hover:bg-slate-50"
                            : "bg-amber-50/20 hover:bg-amber-50/40"
                        }`}
                      >
                        <td className="p-3.5 text-center text-slate-400 text-xs font-mono font-medium">
                          #{emp.serialNumber}
                        </td>
                        <td className="p-3.5 font-ethiopic text-slate-800 font-semibold text-sm">
                          {emp.nameAm}
                        </td>
                        <td className="p-3.5">
                          <select
                            value={row.hours}
                            onChange={(e) => update(emp.id, "hours", e.target.value)}
                            onBlur={() => canEdit && save(emp.id)}
                            disabled={!canEdit || row.saving}
                            className={`w-full rounded-xl border px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 font-ethiopic transition-all ${
                              isAbsent
                                ? "border-rose-200 bg-rose-50/80 text-rose-700 focus:ring-rose-400"
                                : isLeave
                                ? "border-amber-200 bg-amber-50/80 text-amber-700 focus:ring-amber-400"
                                : "border-slate-200 bg-white text-slate-800 focus:ring-blue-400 hover:border-slate-300"
                            }`}
                          >
                            {HOUR_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3.5">
                          <input
                            type="text"
                            value={row.line}
                            placeholder="መስመር ቁ."
                            onChange={(e) => update(emp.id, "line", e.target.value)}
                            onBlur={() => canEdit && save(emp.id)}
                            disabled={!canEdit || row.saving}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white hover:border-slate-300 transition-all font-ethiopic"
                          />
                        </td>
                        <td className="p-3.5 text-center">
                          {row.saving ? (
                            <span className="inline-flex items-center gap-1 text-blue-500 text-xs font-ethiopic">
                              <Loader2 size={13} className="animate-spin" />
                              <span>በመመዝገብ...</span>
                            </span>
                          ) : row.error ? (
                            <span className="inline-flex items-center gap-1 text-rose-600 text-xs font-ethiopic" title={row.error}>
                              <AlertCircle size={13} />
                              <span>ስህተት</span>
                            </span>
                          ) : row.saved ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium font-ethiopic">
                              <Check size={14} className="stroke-[2.5]" />
                              <span>ተመዝግቧል</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-ethiopic">አልተመዘገበም</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
