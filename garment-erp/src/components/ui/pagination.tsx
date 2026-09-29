import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** base URL with any existing query params (without page) */
  buildHref: (page: number) => string;
}

export function Pagination({ page, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
      <span className="text-xs text-slate-500 font-ethiopic">
        ገጽ {page} ከ {totalPages}
      </span>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link
            href={buildHref(page - 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors font-ethiopic"
          >
            <ChevronLeft size={13} /> ቀዳሚ
          </Link>
        ) : (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-white border border-slate-100 cursor-not-allowed font-ethiopic">
            <ChevronLeft size={13} /> ቀዳሚ
          </span>
        )}

        <div className="flex items-center gap-1 mx-1">
          {pages.map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="px-2 text-slate-400 text-xs">…</span>
            ) : (
              <Link
                key={p}
                href={buildHref(p as number)}
                className={`min-w-[30px] h-[30px] flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                  p === page
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {p}
              </Link>
            )
          )}
        </div>

        {page < totalPages ? (
          <Link
            href={buildHref(page + 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors font-ethiopic"
          >
            ቀጣይ <ChevronRight size={13} />
          </Link>
        ) : (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-white border border-slate-100 cursor-not-allowed font-ethiopic">
            ቀጣይ <ChevronRight size={13} />
          </span>
        )}
      </div>
    </div>
  );
}
