"use client";

import { useState } from "react";
import { am } from "@/lib/i18n/am";
import { saveAttendance, bulkAttendance } from "./actions";
import { Check, Loader2, AlertCircle, Users, CheckCircle2, XCircle } from "lucide-react";
import type { AttendanceStatus } from "@prisma/client";

interface AttendanceRecord {
  id: string;
  status: AttendanceStatus;
}

interface EmpRow {
  id: string;
  serialNumber: number;
  nameAm: string;
  jobName: string;
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
  status: AttendanceStatus;
  saving: boolean;
  saved: boolean;
  error: string;
};

const STATUS_OPTIONS: Array<{ label: string; value: AttendanceStatus; color: string }> = [
  { label: "አለ (Present)", value: "PRESENT", color: "emerald" },
  { label: "ቀሪ (Absent)", value: "ABSENT_UNAUTHORIZED", color: "rose" },
  { label: "ፈቃድ (Leave)", value: "ABSENT_AUTHORIZED", color: "amber" },
  { label: "ሕመም (Sick)", value: "SICK_LEAVE", color: "purple" },
];

export function AttendanceGrid({ departments, date, canEdit, userId }: AttendanceGridProps) {
  // Build initial state
  const init: Record<string, RowState> = {};
  for (const d of departments) {
    for (const e of d.employees) {
      init[e.id] = {
        status: e.attendance?.status ?? "PRESENT",
        saving: false,
        saved: !!e.attendance,
        error: "",
      };
    }
  }
  const [rows, setRows] = useState<Record<string, RowState>>(init);
  const [bulkSaving, setBulkSaving] = useState(false);

  function update(empId: string, status: AttendanceStatus) {
    setRows((p) => ({ ...p, [empId]: { ...p[empId], status, saved: false } }));
  }

  async function save(empId: string) {
    const row = rows[empId];
    setRows((p) => ({ ...p, [empId]: { ...p[empId], saving: true, error: "" } }));
    try {
      await saveAttendance({
        date,
        employeeId: empId,
        status: row.status,
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

  async function bulkSaveDept(deptId: string, status: AttendanceStatus) {
    const dept = departments.find((d) => d.id === deptId);
    if (!dept) return;
    setBulkSaving(true);
    const empIds = dept.employees.map((e) => e.id);
    try {
      await bulkAttendance({ date, employeeIds: empIds, status, enteredById: userId });
      setRows((p) => {
        const next = { ...p };
        for (const id of empIds) next[id] = { ...next[id], status, saved: true };
        return next;
      });
    } catch (_) {
      /* silent */
    }
    setBulkSaving(false);
  }

  function getStatusColor(status: AttendanceStatus): string {
    const opt = STATUS_OPTIONS.find(o => o.value === status);
    return opt?.color ?? "slate";
  }

  return (
    <div className="space-y-6">
      {departments.map((dept) => {
        const presentCount = dept.employees.filter((e) => {
          return rows[e.id]?.status === "PRESENT";
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
                    onClick={() => bulkSaveDept(dept.id, "PRESENT")}
                    disabled={bulkSaving}
                    className="inline-flex items-center gap-1.5 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-xl hover:bg-emerald-700 active:scale-95 transition-all font-ethiopic shadow-xs"
                  >
                    <CheckCircle2 size={13} />
                    <span>ሁሉም አለ</span>
                  </button>
                  <button
                    onClick={() => bulkSaveDept(dept.id, "ABSENT_UNAUTHORIZED")}
                    disabled={bulkSaving}
                    className="inline-flex items-center gap-1.5 text-xs bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl hover:bg-rose-100 active:scale-95 transition-all font-ethiopic shadow-xs"
                  >
                    <XCircle size={13} />
                    <span>ሁሉም ቀሪ</span>
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
                    <th className="p-3.5 text-center font-medium w-32">ስራ</th>
                    <th className="p-3.5 text-center font-medium w-56">ክትትል ሁኔታ</th>
                    <th className="p-3.5 text-center font-medium w-24">ሁኔታ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dept.employees.map((emp) => {
                    const row = rows[emp.id];
                    if (!row) return null;
                    
                    const color = getStatusColor(row.status);
                    const bgClass = row.status === "PRESENT" 
                      ? "hover:bg-slate-50"
                      : row.status === "ABSENT_UNAUTHORIZED"
                      ? "bg-rose-50/30"
                      : row.status === "ABSENT_AUTHORIZED"
                      ? "bg-amber-50/30"
                      : "bg-purple-50/30";

                    return (
                      <tr
                        key={emp.id}
                        className={`transition-colors ${
                          row.saved ? bgClass : "bg-amber-50/20 hover:bg-amber-50/40"
                        }`}
                      >
                        <td className="p-3.5 text-center text-slate-400 text-xs font-mono font-medium">
                          #{emp.serialNumber}
                        </td>
                        <td className="p-3.5 font-ethiopic text-slate-800 font-semibold text-sm">
                          {emp.nameAm}
                        </td>
                        <td className="p-3.5 text-center text-slate-600 text-xs font-ethiopic">
                          {emp.jobName}
                        </td>
                        <td className="p-3.5">
                          <select
                            value={row.status}
                            onChange={(e) => {
                              update(emp.id, e.target.value as AttendanceStatus);
                              if (canEdit) {
                                // Auto-save on change
                                setTimeout(() => save(emp.id), 100);
                              }
                            }}
                            disabled={!canEdit || row.saving}
                            className={`w-full rounded-xl border px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 font-ethiopic transition-all ${
                              row.status === "PRESENT"
                                ? "border-emerald-200 bg-emerald-50/80 text-emerald-700 focus:ring-emerald-400"
                                : row.status === "ABSENT_UNAUTHORIZED"
                                ? "border-rose-200 bg-rose-50/80 text-rose-700 focus:ring-rose-400"
                                : row.status === "ABSENT_AUTHORIZED"
                                ? "border-amber-200 bg-amber-50/80 text-amber-700 focus:ring-amber-400"
                                : "border-purple-200 bg-purple-50/80 text-purple-700 focus:ring-purple-400"
                            }`}
                          >
                            {STATUS_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3.5 text-center">
                          {row.saving ? (
                            <span className="inline-flex items-center gap-1 text-blue-500 text-xs font-ethiopic">
                              <Loader2 size={13} className="animate-spin" />
                            </span>
                          ) : row.error ? (
                            <span className="inline-flex items-center gap-1 text-rose-600 text-xs font-ethiopic" title={row.error}>
                              <AlertCircle size={13} />
                            </span>
                          ) : row.saved ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium font-ethiopic">
                              <Check size={14} className="stroke-[2.5]" />
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-ethiopic">—</span>
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
