import { useEffect, useState } from "react";
import type { Paged } from "@/utils/pagination";

/**
 * Pagination di sisi server. `search` di-debounce lalu dikirim ke backend.
 * Pakai `query` di URL fetch dan jadikan dependency useEffect untuk memuat ulang data.
 */
export function useServerPagination(search: string, initialPageSize = 20, debounceMs = 400) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim());
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, debounceMs);
    return () => clearTimeout(t);
  }, [search, debounceMs]);

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  /** Simpan total/totalPages dari respons backend. */
  const setMeta = (data: Paged<unknown> | unknown[] | null | undefined) => {
    if (data && !Array.isArray(data)) {
      setTotal(data.total ?? 0);
      setTotalPages(Math.max(1, data.totalPages ?? 1));
      // halaman sekarang kosong (mis. setelah hapus data terakhir) -> mundur
      if ((data.items?.length ?? 0) === 0 && page > 1 && page > (data.totalPages ?? 1)) {
        setPage(Math.max(1, data.totalPages ?? 1));
      }
    } else {
      setTotal(data?.length ?? 0);
      setTotalPages(1);
    }
  };

  const searchPart = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : "";
  /** Query string halaman aktif. */
  const query = `page=${page}&limit=${pageSize}${searchPart}`;
  /** Query string semua data hasil pencarian (untuk export). */
  const exportQuery = `page=1&limit=0${searchPart}`;

  return { page, setPage, pageSize, setPageSize, total, totalPages, setMeta, query, exportQuery };
}
