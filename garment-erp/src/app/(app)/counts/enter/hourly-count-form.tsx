"use client";

import { useState, useCallback } from "react";
import { am } from "@/lib/i18n/am";
import { calculateDailyCount } from "@/lib/incentive/engine";
import { saveHourlyCounts } from "../actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExistingLine {
  id: string;
  h1: number | null; h2: number | null; h3: number | null; h4: number | null;
  h5: number | null; h6: number | null; h7: number | null; h8: number | null;
  status: string;
  mistakes: number;
  mistakeReason: string | null;
}

interface EmployeeRow {
  id: string;
  serialNumber: number;
  nameAm: string;
  existingLine: ExistingLine | null;
}

interface DeptGroup {
  deptId: string;
  deptNameAm: string;
  targetPerHour: number;
  employees: EmployeeRow[];
}

interface HourlyCountFormProps {
  deptWithEmployees: DeptGroup[];
  date: string;
  supervisorId: string;
}

type HourKey = "h1"|"h2"|"h3"|"h4"|"h5"|"h6"|"h7"|"h8";
const HOUR_KEYS: HourKey[] = ["h1","h2","h3","h4","h5","h6","h7","h8"];

// ─── Row state ────────────────────────────────────────────────────────────────

interface RowState {
  h1: string; h2: string; h3: string; h4: string;
  h5: string; h6: string; h7: string; h8: string;
  mistakes: string;
  mistakeReason: string;
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  error: string;
}

function emptyRow(): RowState {
  return { h1:"",h2:"",h3:"",h4:"",h5:"",h6:"",h7:"",h8:"",
    mistakes:"0", mistakeReason:"", dirty:false, saving:false, saved:false, error:"" };
}

function lineToRow(line: ExistingLine): RowState {
  return {
    h1: line.h1 != null ? String(line.h1) : "",
    h2: line.h2 != null ? String(line.h2) : "",
    h3: line.h3 != null ? String(line.h3) : "",
    h4: line.h4 != null ? String(line.h4) : "",
    h5: line.h5 != null ? String(line.h5) : "",
    h6: line.h6 != null ? String(line.h6) : "",
    h7: line.h7 != null ? String(line.h7) : "",
    h8: line.h8 != null ? String(line.h8) : "",
    mistakes: String(line.mistakes),
    mistakeReason: line.mistakeReason ?? "",
    dirty: false, saving: false, saved: false, error: "",
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HourlyCountForm({ deptWithEmployees, date, supervisorId }: HourlyCountFormProps) {
  // Build initial state: { [employeeId]: RowState }
  const initialState: Record<string, RowState> = {};
  for (const dept of deptWithEmployees) {
    for (const emp of dept.employees) {
      initialState[emp.id] = emp.existingLine
        ? lineToRow(emp.existingLine)
        : emptyRow();
    }
  }

  const [rows, setRows] = useState<Record<string, RowState>>(initialState);
  const [activeEmpId, setActiveEmpId] = useState<string | null>(null);

  const updateRow = useCallback(
    (empId: string, field: keyof RowState, value: string) => {
      setRows((prev) => ({
        ...prev,
        [empId]: { ...prev[empId], [field]: value, dirty: true, saved: false, error: "" },
      }));
    },
    []
  );

  // Save a single row
  const saveRow = useCallback(
    async (empId: string, deptId: string, targetPerHour: number) => {
      const row = rows[empId];
      if (!row.dirty) return;

      setRows((prev) => ({ ...prev, [empId]: { ...prev[empId], saving: true, error: "" } }));

      const hours = HOUR_KEYS.map((k) => (row[k] !== "" ? parseInt(row[k], 10) : null));
      const hoursWorked = hours.filter((h) => h !== null).length;
      const daily = calculateDailyCount({
        hourlyTarget: targetPerHour,
        hoursWorked,
        ...Object.fromEntries(HOUR_KEYS.map((k, i) => [k, hours[i]])),
      });

      // Unusual count warning — above 150% of target
      const THRESHOLD = 1.5;
      if (targetPerHour > 0 && daily.totalProduced > targetPerHour * 8 * THRESHOLD) {
        const confirm = window.confirm(
          `${am.counts.unusualCount}: ${daily.totalProduced} ፍሬ (ዒላማ ${targetPerHour * 8})`
        );
        if (!confirm) {
          setRows((prev) => ({ ...prev, [empId]: { ...prev[empId], saving: false } }));
          return;
        }
      }

      try {
        await saveHourlyCounts({
          date,
          employeeId: empId,
          departmentId: deptId,
          supervisorId,
          hours,
          mistakes: parseInt(row.mistakes || "0", 10),
          mistakeReason: row.mistakeReason || null,
          totalProduced: daily.totalProduced,
          targetForDay: daily.targetForDay,
          plusPieces: daily.plusPieces,
          minusPieces: daily.minusPieces,
        });
        setRows((prev) => ({
          ...prev,
          [empId]: { ...prev[empId], saving: false, saved: true, dirty: false, error: "" },
        }));
      } catch (err) {
        setRows((prev) => ({
          ...prev,
          [empId]: {
            ...prev[empId],
            saving: false,
            error: err instanceof Error ? err.message : "ስህተት ተፈጥሯል",
          },
        }));
      }
    },
    [rows, date, supervisorId]
  );

  return (
    <div className="space-y-8">
      {deptWithEmployees.map((dept) => (
        <DeptSection
          key={dept.deptId}
          dept={dept}
          rows={rows}
          activeEmpId={activeEmpId}
          setActiveEmpId={setActiveEmpId}
          updateRow={updateRow}
          saveRow={saveRow}
        />
      ))}
    </div>
  );
}

// ─── Department section ───────────────────────────────────────────────────────

interface DeptSectionProps {
  dept: DeptGroup;
  rows: Record<string, RowState>;
  activeEmpId: string | null;
  setActiveEmpId: (id: string | null) => void;
  updateRow: (empId: string, field: keyof RowState, value: string) => void;
  saveRow: (empId: string, deptId: string, targetPerHour: number) => Promise<void>;
}

function DeptSection({ dept, rows, activeEmpId, setActiveEmpId, updateRow, saveRow }: DeptSectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Dept header */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 font-ethiopic">{dept.deptNameAm}</h3>
        {dept.targetPerHour > 0 && (
          <span className="text-xs text-gray-500 font-ethiopic">
            {am.counts.targetPerHour ?? "በሰዓት ዒላማ"}: {dept.targetPerHour}
          </span>
        )}
      </div>

      {/* Header row */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-right p-3 text-gray-500 font-medium w-8">{am.serialNumber}</th>
              <th className="text-right p-3 text-gray-500 font-medium min-w-[120px]">{am.employees.name}</th>
              {HOUR_KEYS.map((h) => (
                <th key={h} className="p-3 text-gray-500 font-medium text-center w-14">
                  {am.counts[h]}
                </th>
              ))}
              <th className="p-3 text-gray-500 font-medium text-center w-16">{am.counts.plus}</th>
              <th className="p-3 text-gray-500 font-medium text-center w-16">{am.counts.minus}</th>
              <th className="p-3 text-gray-500 font-medium text-center w-12">{am.counts.mistakes}</th>
              <th className="p-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {dept.employees.map((emp) => (
              <EmployeeRow
                key={emp.id}
                emp={emp}
                deptId={dept.deptId}
                targetPerHour={dept.targetPerHour}
                row={rows[emp.id] ?? emptyRow()}
                isActive={activeEmpId === emp.id}
                onFocus={() => setActiveEmpId(emp.id)}
                updateRow={updateRow}
                saveRow={saveRow}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Employee row ─────────────────────────────────────────────────────────────

interface EmployeeRowProps {
  emp: EmployeeRow;
  deptId: string;
  targetPerHour: number;
  row: RowState;
  isActive: boolean;
  onFocus: () => void;
  updateRow: (empId: string, field: keyof RowState, value: string) => void;
  saveRow: (empId: string, deptId: string, targetPerHour: number) => Promise<void>;
}

function EmployeeRow({ emp, deptId, targetPerHour, row, isActive, onFocus, updateRow, saveRow }: EmployeeRowProps) {
  // Compute running totals from current row input
  const hours = HOUR_KEYS.map((k) => (row[k] !== "" ? parseInt(row[k], 10) : null));
  const hoursWorked = hours.filter((h) => h !== null).length;
  const daily = calculateDailyCount({
    hourlyTarget: targetPerHour, hoursWorked,
    ...Object.fromEntries(HOUR_KEYS.map((k, i) => [k, hours[i]])),
  });

  const rowBg = row.saved
    ? "bg-green-50"
    : row.dirty
    ? "bg-amber-50"
    : "hover:bg-gray-50";

  return (
    <tr className={`border-b border-gray-50 transition-colors ${rowBg}`} onFocus={onFocus}>
      {/* Serial */}
      <td className="p-2 text-center text-gray-400 text-xs tabular-nums">{emp.serialNumber}</td>
      {/* Name */}
      <td className="p-2 font-ethiopic text-gray-800 text-sm">{emp.nameAm}</td>
      {/* Hour inputs */}
      {HOUR_KEYS.map((hk) => (
        <td key={hk} className="p-1 text-center">
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="9999"
            value={row[hk]}
            onChange={(e) => updateRow(emp.id, hk, e.target.value)}
            onBlur={() => {
              if (row.dirty) saveRow(emp.id, deptId, targetPerHour);
            }}
            className="w-14 text-center rounded-lg border border-gray-200 py-1.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-400 tabular-nums
              disabled:bg-gray-50 disabled:text-gray-400"
            disabled={row.saving}
            placeholder="—"
          />
        </td>
      ))}
      {/* + pieces */}
      <td className="p-2 text-center tabular-nums font-medium">
        {daily.plusPieces > 0 ? (
          <span className="text-green-700">+{daily.plusPieces}</span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      {/* - pieces */}
      <td className="p-2 text-center tabular-nums font-medium">
        {daily.minusPieces > 0 ? (
          <span className="text-red-600">−{daily.minusPieces}</span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      {/* Mistakes */}
      <td className="p-1 text-center">
        <input
          type="number"
          inputMode="numeric"
          min="0"
          max="99"
          value={row.mistakes}
          onChange={(e) => updateRow(emp.id, "mistakes", e.target.value)}
          className="w-12 text-center rounded-lg border border-gray-200 py-1.5 text-sm
            focus:outline-none focus:ring-2 focus:ring-orange-400 tabular-nums"
          disabled={row.saving}
        />
      </td>
      {/* Save indicator / button */}
      <td className="p-2 text-center">
        {row.saving && <span className="text-blue-400 text-xs">...</span>}
        {row.saved && !row.dirty && <span className="text-green-500 text-lg">✓</span>}
        {row.error && (
          <span className="text-red-500 text-xs font-ethiopic" title={row.error}>!</span>
        )}
        {row.dirty && !row.saving && (
          <button
            onClick={() => saveRow(emp.id, deptId, targetPerHour)}
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg
              hover:bg-blue-700 transition-colors font-ethiopic"
          >
            {am.save}
          </button>
        )}
      </td>
    </tr>
  );
}
