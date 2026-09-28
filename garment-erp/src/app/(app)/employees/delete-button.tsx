"use client";

import { useTransition } from "react";
import { deleteEmployee } from "./actions";
import { Trash2 } from "lucide-react";

export function DeleteEmployeeButton({ empId, nameAm }: { empId: string; nameAm: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`"${nameAm}" የተባሉትን ሠራተኛ ከዝርዝር ማውጣት ይፈልጋሉ?\n(የሥራ ሁኔታቸው ወደ "የማይሰራ" ይቀየራል)`)) return;
    startTransition(() => deleteEmployee(empId));
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40"
      title="ከዝርዝር አስወግድ"
    >
      <Trash2 size={15} />
    </button>
  );
}
