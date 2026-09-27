"use client";

export function DatePicker({ defaultValue }: { defaultValue: string }) {
  return (
    <input
      type="date"
      defaultValue={defaultValue}
      onChange={(e) => {
        if (e.target.value) {
          window.location.href = `/attendance?date=${e.target.value}`;
        }
      }}
      className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 bg-white shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-sans"
    />
  );
}
