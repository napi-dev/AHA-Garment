"use client";

import { useState } from "react";
import { am } from "@/lib/i18n/am";
import { saveAttendance, bulkAttendance } from "./actions";

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
  { label: am.attendance.absent,    value: "0" },
  { label: "4",                      value: "4" },
  { label: "5",                      value: "5" },
  { label: "6",                      value: "6" },
  { label: "7",                      value: "7" },
  { label: am.attendance.fullShift,  value: "8" },
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
      setRows((p) => ({ ...p, [empId]: { ...p[empId], saving: false, error: e instanceof Error ? e.message : "ስህተት" } }));
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
    } catch (_) { /* silent */ }
    setBulkSaving(false);
  }

  return (
    <div className="space-y-6">
      {departments.map((dept) => (
        <div key={dept.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Dept header with bulk action */}
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-semibold text-gray-800 font-ethiopic">{dept.nameAm}</h3>
            {canEdit && (
              <div className="flex gap-2 items-center">
                <span className="text-xs text-gray-500 font-ethiopic">{am.attendance.bulkAttendance}:</span>
                <button
                  onClick={() => bulkSaveDept(dept.id, 8)}
                  disabled={bulkSaving}
                  className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors font-ethiopic"
                >
                  {am.attendance.fullShift}
                </button>
                <button
                  onClick={() => bulkSaveDept(dept.id, 0)}
                  disabled={bulkSaving}
                  className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors font-ethiopic"
                >
                  {am.attendance.absent}
                </button>
              </div>
            )}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="p-3 text-right font-medium w-10">{am.serialNumber}</th>
                <th className="p-3 text-right font-medium">{am.employees.name}</th>
                <th className="p-3 text-center font-medium w-40">{am.attendance.hoursWorked}</th>
                <th className="p-3 text-center font-medium w-28">{am.attendance.line}</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {dept.employees.map((emp) => {
                const row = rows[emp.id];
                if (!row) return null;
                const isAbsent = row.hours === "0";
                return (
                  <tr
                    key={emp.id}
                    className={`border-b border-gray-50 transition-colors ${
                      row.saved ? "bg-green-50/40" : isAbsent ? "bg-red-50/40" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="p-2 text-center text-gray-400 text-xs tabular-nums">{emp.serialNumber}</td>
                    <td className="p-2 font-ethiopic text-gray-800">{emp.nameAm}</td>
                    <td className="p-2">
                      <select
                        value={row.hours}
                        onChange={(e) => update(emp.id, "hours", e.target.value)}
                        onBlur={() => canEdit && save(emp.id)}
                        disabled={!canEdit || row.saving}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-ethiopic"
                      >
                        {HOUR_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                        <option value="8">8 ሰዓት</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.line}
                        placeholder="ረድፍ"
                        onChange={(e) => update(emp.id, "line", e.target.value)}
                        onBlur={() => canEdit && save(emp.id)}
                        disabled={!canEdit || row.saving}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-center"
                      />
                    </td>
                    <td className="p-2 text-center">
                      {row.saving && <span className="text-blue-400 text-xs">...</span>}
                      {row.saved && !row.saving && <span className="text-green-500">✓</span>}
                      {row.error && <span className="text-red-500 text-xs" title={row.error}>!</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
