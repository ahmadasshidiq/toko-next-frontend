import { useMemo, useState } from "react";

export function usePagination<T>(items: T[] | undefined, initialPageSize = 20) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [prevItems, setPrevItems] = useState(items);

  // Back to page 1 whenever the data set changes (e.g. filter/search)
  if (items !== prevItems) {
    setPrevItems(items);
    setPage(1);
  }

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  const total = items?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return (items ?? []).slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  return { page: currentPage, setPage, pageSize, setPageSize, total, totalPages, pageRows };
}
