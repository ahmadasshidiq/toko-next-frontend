"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
};

function getPageNumbers(page: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) pages.push("ellipsis");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}

export default function DataTablePagination({
  page,
  totalPages,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: Props) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const go = (p: number) => {
    if (p >= 1 && p <= totalPages && p !== page) onPageChange(p);
  };

  const btn =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors";

  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-3 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span>Tampilkan</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-sm focus:border-jax-lime focus:outline-none"
          >
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <span>per halaman</span>
        </div>
        <span className="hidden h-4 w-px bg-gray-200 md:block" />
        <span>
          <span className="font-medium text-gray-900">
            {from}–{to}
          </span>{" "}
          dari <span className="font-medium text-gray-900">{total}</span> data
        </span>
      </div>

      <nav aria-label="pagination" className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Halaman sebelumnya"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
          className={cn(btn, "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {getPageNumbers(page, totalPages).map((p, i) =>
          p === "ellipsis" ? (
            <span key={`e${i}`} className="px-1 text-gray-400">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-current={p === page ? "page" : undefined}
              onClick={() => go(p)}
              className={cn(
                btn,
                p === page
                  ? "bg-jax-lime text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          aria-label="Halaman berikutnya"
          disabled={page >= totalPages}
          onClick={() => go(page + 1)}
          className={cn(btn, "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}
