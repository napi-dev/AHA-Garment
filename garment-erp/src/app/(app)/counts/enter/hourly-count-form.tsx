"use client";

import { useState, useCallback } from "react";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import { calculateDailyCount } from "@/lib/incentive/engine";
import { saveHourlyCounts } from "../actions";
import { Check, Loader2, AlertCircle, Save, Target, Sparkles, Building2, Calendar, CheckCircle2, Lock } from "lucide-react";

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
  isReadOnly?: boolean; // True when day is closed
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
    // Mark as already saved so the row shows the green ✓ on load
    dirty: false, saving: false, saved: true, error: "",
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HourlyCountForm({ deptWithEmployees, date, supervisorId, isReadOnly = false }: HourlyCountFormProps) {
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

  // Count how many rows are already saved (had existing data)
  const totalRows    = Object.keys(initialState).length;
  const alreadySaved = Object.values(initialState).filter((r) => r.saved).length;

  // Format the date nicely — use Ethiopian calendar formatter which is EAT-aware
  const dateObj = new Date(date);
  const dateDisplay = formatAsEthDate(dateObj);

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
          `${am.counts.unusualCount}: ${daily.totalProduced} ፍሬ (የሚጠበቅ ዒላማ ${targetPerHour * 8})`
        );
        if (!confirm) {
          setRows((prev) => ({ ...prev, [empId]: { ...prev[empId], saving: false } }));
          return;
        }
      }

      try {
        const result = await saveHourlyCounts({
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

        if (result.ok) {
          setRows((prev) => ({
            ...prev,
            [empId]: { ...prev[empId], saving: false, saved: true, dirty: false, error: "" },
          }));
        } else {
          setRows((prev) => ({
            ...prev,
            [empId]: { ...prev[empId], saving: false, error: result.message },
          }));
        }
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
    <div className="space-y-6">
      {/* Date header & saved count indicator */}
      <div className="erp-card p-5 flex items-center justify-between gap-4 flex-wrap border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-sm">
            <Calendar size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-ethiopic mb-0.5">የቁጥር መሙላት ቀን</p>
            <p className="text-base font-bold text-slate-900 font-mono">{dateDisplay}</p>
          </div>
          {isReadOnly && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200 font-ethiopic flex items-center gap-1">
              <Lock size={12} />
              ተዘግቷል
            </span>
          )}
        </div>

        {alreadySaved > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="text-xs font-semibold font-ethiopic">
              {alreadySaved} ሠራተኞች ቁጥራቸውን አስቀድመዋል ({Math.round((alreadySaved / totalRows) * 100)}%)
            </span>
          </div>
        )}

        {alreadySaved === 0 && !isReadOnly && (
          <span className="text-xs text-slate-400 font-ethiopic">
            ለዚህ ቀን ገና የተመዘገበ ቁጥር የለም
          </span>
        )}
      </div>

      {deptWithEmployees.map((dept) => (
        <DeptSection
          key={dept.deptId}
          dept={dept}
          rows={rows}
          activeEmpId={activeEmpId}
          setActiveEmpId={setActiveEmpId}
          updateRow={updateRow}
          saveRow={saveRow}
          isReadOnly={isReadOnly}
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
  isReadOnly?: boolean;
}

function DeptSection({ dept, rows, activeEmpId, setActiveEmpId, updateRow, saveRow, isReadOnly = false }: DeptSectionProps) {
  return (
    <div className="erp-card overflow-hidden shadow-sm">
      {/* Dept header */}
      <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <Building2 size={16} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 font-ethiopic text-sm">
              {dept.deptNameAm}
            </h3>
            <p className="text-xs text-slate-500 font-ethiopic">
              {dept.employees.length} ሠራተኞች ተመድበዋል
            </p>
          </div>
        </div>

        {dept.targetPerHour > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70 font-ethiopic">
            <Target size={13} />
            <span>በሰዓት የሚጠበቅ ዒላማ፦ <span className="font-bold font-mono">{dept.targetPerHour}</span> ፍሬ</span>
          </span>
        )}
      </div>

      {/* Table grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200/80 bg-white text-slate-500 font-ethiopic text-xs">
              <th className="text-center p-3.5 font-medium w-12">{am.serialNumber}</th>
              <th className="text-right p-3.5 font-medium min-w-[140px]">{am.employees.name}</th>
              {HOUR_KEYS.map((h, i) => (
                <th key={h} className="p-3.5 font-medium text-center w-14">
                  {`ሰዓት ${i + 1}`}
                </th>
              ))}
              <th className="p-3.5 text-center font-semibold text-emerald-700 w-16 bg-emerald-50/30">
                {am.counts.plus}
              </th>
              <th className="p-3.5 text-center font-semibold text-rose-700 w-16 bg-rose-50/30">
                {am.counts.minus}
              </th>
              <th className="p-3.5 text-center font-semibold text-amber-700 w-16 bg-amber-50/30">
                {am.counts.mistakes}
              </th>
              <th className="p-3.5 text-center font-medium w-24">ሁኔታ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
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
                isReadOnly={isReadOnly}
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
  isReadOnly?: boolean;
}

function EmployeeRow({
  emp,
  deptId,
  targetPerHour,
  row,
  isActive,
  onFocus,
  updateRow,
  saveRow,
  isReadOnly = false,
}: EmployeeRowProps) {
  // Compute running totals from current row input
  const hours = HOUR_KEYS.map((k) => (row[k] !== "" ? parseInt(row[k], 10) : null));
  const hoursWorked = hours.filter((h) => h !== null).length;
  const daily = calculateDailyCount({
    hourlyTarget: targetPerHour,
    hoursWorked,
    ...Object.fromEntries(HOUR_KEYS.map((k, i) => [k, hours[i]])),
  });

  const rowBg = row.saved
    ? "bg-emerald-50/30 hover:bg-emerald-50/50"
    : row.dirty
    ? "bg-amber-50/40 hover:bg-amber-50/60"
    : "hover:bg-slate-50";

  return (
    <tr className={`transition-colors ${rowBg}`} onFocus={onFocus}>
      {/* Serial */}
      <td className="p-3 text-center text-slate-400 text-xs font-mono font-medium">
        #{emp.serialNumber}
      </td>

      {/* Name */}
      <td className="p-3 font-ethiopic text-slate-800 font-semibold text-sm">
        {emp.nameAm}
      </td>

      {/* Hour inputs (h1..h8) */}
      {HOUR_KEYS.map((hk) => (
        <td key={hk} className="p-1.5 text-center">
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="9999"
            value={row[hk]}
            onChange={(e) => updateRow(emp.id, hk, e.target.value)}
            onBlur={() => {
              if (row.dirty && !isReadOnly) saveRow(emp.id, deptId, targetPerHour);
            }}
            className="w-13 text-center rounded-xl border border-slate-200 py-1.5 text-xs font-bold
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 tabular-nums
              disabled:bg-slate-50 disabled:text-slate-400 bg-white hover:border-slate-300 transition-all"
            disabled={row.saving || isReadOnly}
            placeholder="—"
            readOnly={isReadOnly}
          />
        </td>
      ))}

      {/* + pieces */}
      <td className="p-3 text-center tabular-nums font-bold text-sm bg-emerald-50/20">
        {daily.plusPieces > 0 ? (
          <span className="text-emerald-700">+{daily.plusPieces}</span>
        ) : (
          <span className="text-slate-300 font-normal">—</span>
        )}
      </td>

      {/* - pieces */}
      <td className="p-3 text-center tabular-nums font-bold text-sm bg-rose-50/20">
        {daily.minusPieces > 0 ? (
          <span className="text-rose-600">−{daily.minusPieces}</span>
        ) : (
          <span className="text-slate-300 font-normal">—</span>
        )}
      </td>

      {/* Mistakes */}
      <td className="p-1.5 text-center bg-amber-50/20">
        <input
          type="number"
          inputMode="numeric"
          min="0"
          max="99"
          value={row.mistakes}
          onChange={(e) => updateRow(emp.id, "mistakes", e.target.value)}
          onBlur={() => {
            if (row.dirty && !isReadOnly) saveRow(emp.id, deptId, targetPerHour);
          }}
          className="w-12 text-center rounded-xl border border-amber-200 py-1.5 text-xs font-bold text-amber-900
            focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 tabular-nums bg-white"
          disabled={row.saving || isReadOnly}
          readOnly={isReadOnly}
        />
      </td>

      {/* Save indicator / button */}
      <td className="p-3 text-center">
        {row.saving ? (
          <span className="inline-flex items-center gap-1 text-blue-500 text-xs font-ethiopic">
            <Loader2 size={13} className="animate-spin" />
          </span>
        ) : row.error ? (
          <span className="inline-flex items-center gap-1 text-rose-600 text-xs font-ethiopic" title={row.error}>
            <AlertCircle size={14} />
          </span>
        ) : row.dirty && !isReadOnly ? (
          <button
            onClick={() => saveRow(emp.id, deptId, targetPerHour)}
            className="inline-flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700 transition-colors font-ethiopic shadow-xs active:scale-95"
          >
            <Save size={12} />
            <span>{am.save}</span>
          </button>
        ) : row.saved ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium font-ethiopic">
            <Check size={14} className="stroke-[2.5]" />
          </span>
        ) : (
          <span className="text-slate-300 text-xs font-ethiopic">—</span>
        )}
      </td>
    </tr>
  );
}
