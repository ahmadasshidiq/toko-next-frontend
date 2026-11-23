// Helper pagination server-side untuk route API Next.

const KEYS = ["page", "limit", "sort", "search"] as const;

/** Ambil page/limit/sort/search dari query request lalu jadikan query string untuk backend ("" jika tidak ada). */
export function paginationQuery(searchParams: URLSearchParams): string {
  const qs = new URLSearchParams();
  for (const k of KEYS) {
    const v = searchParams.get(k);
    if (v !== null && v !== "") qs.set(k, v);
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export type Paged<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/** Backend mengembalikan array (tanpa page) atau Paged (dengan page). Ambil daftar item-nya. */
export function listOf<T>(data: T[] | Paged<T> | null | undefined): T[] {
  if (!data) return [];
  return Array.isArray(data) ? data : data.items ?? [];
}

/** Ganti daftar item dengan hasil enrich, tetap mempertahankan bentuk (array / Paged). */
export function withList<T, U>(data: T[] | Paged<T> | null | undefined, list: U[]): U[] | Paged<U> {
  if (data && !Array.isArray(data)) return { ...data, items: list };
  return list;
}
