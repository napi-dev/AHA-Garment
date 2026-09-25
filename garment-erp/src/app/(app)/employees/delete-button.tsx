"use client";

import { useTransition } from "react";
import { deleteEmployee } from "./actions";

export function DeleteEmployeeButton({ empId, nameAm }: { empId: string; nameAm: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`"${nameAm}" ሠራተኛ ይሰርዙ?\n(ከንቁ ሠራተኞች ዝርዝር ይወጣሉ)`)) return;
    startTransition(() => deleteEmployee(empId));
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="text-xs text-red-500 hover:underline font-ethiopic disabled:opacity-40"
    >
      {pending ? "..." : "አጥፋ"}
    </button>
  );
}
