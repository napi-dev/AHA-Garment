"use client";

import { useState, useCallback, useEffect } from "react";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import { calculateDailyCount } from "@/lib/incentive/engine";
import { saveHourlyBox } from "../actions";
import { Check, Loader2, AlertCircle, Save, Target, Briefcase, Calendar, CheckCircle2, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExistingBox {
  id: string;
  h1: number | null; h2: number | null; h3: number | null; h4: number | null;
  h5: number | null; h6: number | null; h7: number | null; h8: number | null;
  totalProduced: number;
  targetForDay: number;
  plusPieces: number;
  minusPieces: number;
  mistakes: number;
  mistakeReason: string | null;
  isLocked: boolean;
}

interface EmployeeRow {
  id: string;
  serialNumber: number;
  nameAm: string;
  existingBox: ExistingBox | null;
}

interface HourlyCountFormProps {
  jobId: string;
  jobNameAm: string;
  departmentId: string;
  departmentNameAm: string;
  targetPerHour: number;
  employees: EmployeeRow[];
  date: string;
  supervisorId: string;
  isReadOnly?: boolean;
  currentPage: number;
  totalPages: number;
  totalEmployees: number;
  needsPagination: boolean;
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

function boxToRow(box: ExistingBox): RowState {
  return {
    h1: box.h1 != null ? String(box.h1) : "",
    h2: box.h2 != null ? String(box.h2) : "",
    h3: box.h3 != null ? String(box.h3) : "",
    h4: box.h4 != null ? String(box.h4) : "",
    h5: box.h5 != null ? String(box.h5) : "",
    h6: box.h6 != null ? String(box.h6) : "",
    h7: box.h7 != null ? String(box.h7) : "",
    h8: box.h8 != null ? String(box.h8) : "",
    mistakes: String(box.mistakes),
    mistakeReason: box.mistakeReason ?? "",
    dirty: false, saving: false, saved: true, error: "",
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HourlyCountForm({ 
  jobId,
  jobNameAm,
  departmentId,
  departmentNameAm,
  targetPerHour, 
  employees, 
  date, 
  supervisorId, 
  isReadOnly = false,
  currentPage,
  totalPages,
  totalEmployees,
  needsPagination,
}: HourlyCountFormProps) {
  // Build initial state: { [employeeId]: RowState }
  const buildInitialState = useCallback(() => {
    const initialState: Record<string, RowState> = {};
    for (const emp of employees) {
      initialState[emp.id] = emp.existingBox
        ? boxToRow(emp.existingBox)
        : emptyRow();
    }
    return initialState;
  }, [employees]);

  const [rows, setRows] = useState<Record<string, RowState>>(buildInitialState);
  const [activeEmpId, setActiveEmpId] = useState<string | null>(null);

  // Rebuild state when employees change (page navigation)
  useEffect(() => {
    setRows(buildInitialState());
  }, [employees, buildInitialState]);

  const totalRows    = employees.length;
  const alreadySaved = Object.values(rows).filter((r) => r.saved).length;

  const dateObj = new Date(date);
  const dateDisplay = formatAsEthDate(dateObj);
  const dateStr = dateObj.toISOString().split("T")[0];

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
    async (empId: string) => {
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

      // Unusual count warning
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
        const result = await saveHourlyBox({
          date: date.split("T")[0],
          employeeId: empId,
          jobId,
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
    [rows, date, jobId, supervisorId, targetPerHour]
  );

  return (
    <div className="space-y-6">
      {/* Date header & job info */}
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

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-blue-200">
            <Briefcase size={16} className="text-blue-600" />
            <div>
              <p className="text-xs text-slate-500 font-ethiopic">ስራ</p>
              <p className="text-sm font-bold text-slate-900 font-ethiopic">{jobNameAm}</p>
            </div>
          </div>

          {targetPerHour > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
              <Target size={16} className="text-emerald-600" />
              <div>
                <p className="text-xs text-slate-500 font-ethiopic">በሰዓት ዒላማ</p>
                <p className="text-sm font-bold text-emerald-700 font-mono">{targetPerHour} ፍሬ</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {alreadySaved > 0 && (
        <div className="erp-card p-4 bg-emerald-50 border-emerald-200">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="text-xs font-semibold font-ethiopic">
              {alreadySaved} ሠራተኞች ቁጥራቸውን አስቀድመዋል ({Math.round((alreadySaved / totalRows) * 100)}%)
            </span>
          </div>
        </div>
      )}

      <div className="erp-card overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 font-ethiopic text-sm">
                {departmentNameAm} - {jobNameAm}
              </h3>
              <p className="text-xs text-slate-500 font-ethiopic mt-0.5">
                {needsPagination 
                  ? `${totalEmployees} ሠራተኞች ጠቅላላ · ገጽ ${currentPage}/${totalPages} · ${employees.length} በዚህ ገጽ`
                  : `${employees.length} ሠራተኞች በዚህ ስራ ተመድበዋል`
                }
              </p>
            </div>
            {needsPagination && (
              <div className="flex items-center gap-2">
                {currentPage > 1 && (
                  <Link
                    href={`?job=${jobId}&date=${dateStr}&page=${currentPage - 1}`}
                    className="inline-flex items-center gap-1.5 text-xs bg-white text-slate-700 border border-slate-300 px-3 py-2 rounded-xl hover:bg-slate-50 active:scale-95 transition-all font-ethiopic shadow-xs"
                  >
                    <ChevronLeft size={14} />
                    <span>ቀዳሚ</span>
                  </Link>
                )}
                {currentPage < totalPages && (
                  <Link
                    href={`?job=${jobId}&date=${dateStr}&page=${currentPage + 1}`}
                    className="inline-flex items-center gap-1.5 text-xs bg-white text-slate-700 border border-slate-300 px-3 py-2 rounded-xl hover:bg-slate-50 active:scale-95 transition-all font-ethiopic shadow-xs"
                  >
                    <span>ቀጣይ</span>
                    <ChevronRight size={14} />
                  </Link>
                )}
              </div>
            )}
          </div>
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
              {employees.map((emp) => (
                <EmployeeRow
                  key={emp.id}
                  emp={emp}
                  targetPerHour={targetPerHour}
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

        {/* Pagination Footer */}
        {needsPagination && (
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between gap-4">
            <div className="text-xs text-slate-500 font-ethiopic">
              ገጽ {currentPage} ከ {totalPages} · {alreadySaved}/{totalRows} ተቀምጧል
            </div>
            <div className="flex items-center gap-2">
              {currentPage > 1 && (
                <Link
                  href={`?job=${jobId}&date=${dateStr}&page=${currentPage - 1}`}
                  className="inline-flex items-center gap-1.5 text-xs bg-white text-slate-700 border border-slate-300 px-3 py-2 rounded-xl hover:bg-slate-50 active:scale-95 transition-all font-ethiopic shadow-xs"
                >
                  <ChevronLeft size={14} />
                  <span>ቀዳሚ</span>
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`?job=${jobId}&date=${dateStr}&page=${currentPage + 1}`}
                  className="inline-flex items-center gap-1.5 text-xs bg-white text-slate-700 border border-slate-300 px-3 py-2 rounded-xl hover:bg-slate-50 active:scale-95 transition-all font-ethiopic shadow-xs"
                >
                  <span>ቀጣይ</span>
                  <ChevronRight size={14} />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Employee row ─────────────────────────────────────────────────────────────

interface EmployeeRowProps {
  emp: EmployeeRow;
  targetPerHour: number;
  row: RowState;
  isActive: boolean;
  onFocus: () => void;
  updateRow: (empId: string, field: keyof RowState, value: string) => void;
  saveRow: (empId: string) => Promise<void>;
  isReadOnly?: boolean;
}

function EmployeeRow({
  emp,
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
              if (row.dirty && !isReadOnly) saveRow(emp.id);
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
            if (row.dirty && !isReadOnly) saveRow(emp.id);
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
            onClick={() => saveRow(emp.id)}
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
