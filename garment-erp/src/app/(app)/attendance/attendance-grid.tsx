"use client";

import { useState } from "react";
import { am } from "@/lib/i18n/am";
import { saveAttendance, submitAttendance } from "./actions";
import { Check, Loader2, AlertCircle, CheckCircle2, XCircle, Save, ChevronLeft, ChevronRight } from "lucide-react";
import type { AttendanceStatus } from "@prisma/client";
import Link from "next/link";

interface AttendanceRecord {
  id: string;
  status: AttendanceStatus;
}

interface EmpRow {
  id: string;
  serialNumber: number;
  nameAm: string;
  jobName: string;
  departmentName: string;
  attendance: AttendanceRecord | null;
}

interface AttendanceGridProps {
  employees: EmpRow[];
  date: string;
  canEdit: boolean;
  userId: string;
  isLineSupervisor: boolean;
  currentPage: number;
  totalPages: number;
}

type RowState = {
  status: AttendanceStatus;
  saving: boolean;
  saved: boolean;
  error: string;
};

const STATUS_OPTIONS: Array<{ label: string; value: AttendanceStatus; color: string }> = [
  { label: "አለ", value: "PRESENT", color: "emerald" },
  { label: "ቀሪ", value: "ABSENT_UNAUTHORIZED", color: "rose" },
  { label: "ፈቃድ", value: "ABSENT_AUTHORIZED", color: "amber" },
  { label: "የሃኪም ማስረጃ", value: "SICK_LEAVE", color: "purple" },
];

export function AttendanceGrid({ 
  employees, 
  date, 
  canEdit, 
  userId, 
  isLineSupervisor,
  currentPage,
  totalPages 
}: AttendanceGridProps) {
  // Build initial state
  const init: Record<string, RowState> = {};
  for (const e of employees) {
    init[e.id] = {
      status: e.attendance?.status ?? "PRESENT",
      saving: false,
      saved: !!e.attendance,
      error: "",
    };
  }
  const [rows, setRows] = useState<Record<string, RowState>>(init);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  async function bulkSaveAll(status: AttendanceStatus) {
    setBulkSaving(true);
    const empIds = employees.map((e) => e.id);
    try {
      for (const empId of empIds) {
        await saveAttendance({
          date,
          employeeId: empId,
          status,
          enteredById: userId,
        });
        setRows((p) => ({ ...p, [empId]: { ...p[empId], status, saved: true } }));
      }
    } catch (_) {
      /* silent */
    }
    setBulkSaving(false);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await submitAttendance({ date, supervisorId: userId });
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "ስህተት");
    }
    setSubmitting(false);
  }

  function getStatusColor(status: AttendanceStatus): string {
    const opt = STATUS_OPTIONS.find(o => o.value === status);
    return opt?.color ?? "slate";
  }

  const presentCount = employees.filter((e) => {
    return rows[e.id]?.status === "PRESENT";
  }).length;

  return (
    <div className="space-y-6">
      {/* Single Table for All Employees */}
      <div className="erp-card overflow-hidden shadow-sm">
        {/* Header with Bulk Actions */}
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-slate-500 font-ethiopic">
              ገጽ {currentPage} ከ {totalPages} · የቀረቡ፦ <span className="font-semibold text-emerald-600">{presentCount}</span> / {employees.length}
            </p>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 font-ethiopic">የጋራ መመዝገቢያ፦</span>
              <button
                onClick={() => bulkSaveAll("PRESENT")}
                disabled={bulkSaving}
                className="inline-flex items-center gap-1.5 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-xl hover:bg-emerald-700 active:scale-95 transition-all font-ethiopic shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 size={13} />
                <span>ሁሉም አለ</span>
              </button>
              <button
                onClick={() => bulkSaveAll("ABSENT_UNAUTHORIZED")}
                disabled={bulkSaving}
                className="inline-flex items-center gap-1.5 text-xs bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl hover:bg-rose-100 active:scale-95 transition-all font-ethiopic shadow-xs disabled:opacity-50"
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
                <th className="p-3.5 text-center font-medium w-16">ተ.ቁ</th>
                <th className="p-3.5 text-right font-medium">ሙሉ ስም</th>
                <th className="p-3.5 text-center font-medium w-40">የስራ ክፍል</th>
                <th className="p-3.5 text-center font-medium w-56">የተሠራበት የሰዓት ብዛት</th>
                <th className="p-3.5 text-center font-medium w-24">ሁኔታ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((emp) => {
                const row = rows[emp.id];
                if (!row) return null;
                
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
                      {emp.departmentName}
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

        {/* Pagination and Submit */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {currentPage > 1 && (
              <Link
                href={`?date=${date}&page=${currentPage - 1}`}
                className="inline-flex items-center gap-1.5 text-xs bg-white text-slate-700 border border-slate-300 px-3 py-2 rounded-xl hover:bg-slate-50 active:scale-95 transition-all font-ethiopic shadow-xs"
              >
                <ChevronLeft size={14} />
                <span>ቀዳሚ</span>
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={`?date=${date}&page=${currentPage + 1}`}
                className="inline-flex items-center gap-1.5 text-xs bg-white text-slate-700 border border-slate-300 px-3 py-2 rounded-xl hover:bg-slate-50 active:scale-95 transition-all font-ethiopic shadow-xs"
              >
                <span>ቀጣይ</span>
                <ChevronRight size={14} />
              </Link>
            )}
          </div>

          {/* Submit Button for Line Supervisor on last page */}
          {isLineSupervisor && canEdit && currentPage === totalPages && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 active:scale-95 transition-all font-ethiopic shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>በማስቀመጥ ላይ...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>አስቀምጥ እና ቆልፍ</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
