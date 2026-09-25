"use client";

export function DatePicker({ defaultValue }: { defaultValue: string }) {
  return (
    <input
      type="date"
      defaultValue={defaultValue}
      onChange={(e) => {
        window.location.href = `/attendance?date=${e.target.value}`;
      }}
      className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}
