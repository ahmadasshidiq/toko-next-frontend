"use client";

import AppShell from "@/components/AppShell";
import SidebarTrigger from "@/components/SidebarTrigger";
import DataTablePagination from "@/components/DataTablePagination";
import TableEmpty from "@/components/TableEmpty";
import { useRouter } from "@/lib/useAppRouter";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, HandCoins, Loader2, Search } from "lucide-react";
import type { Branch } from "../manage/branch/page";

/** Status kasbon — sama dengan aplikasi mobile. */
const BELUM_LUNAS = "belum lunas";
const LUNAS = "lunas";

type Kasbon = {
  _id: string;
  cabangId: string;
  membershipsId: string;
  memberId?: string;
  transaksiId: string;
  note: string;
  date: string;
  status: string;
  noInvoice: string;
  total: number;
  dibayar: number;
  sisa: number;
  memberName: string;
  memberPhone: string;
};

const rupiah = (n: number) => `Rp ${Math.round(n || 0).toLocaleString("id-ID")}`;
const fmtDate = (s: string) => {
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};
const isLunas = (k: Kasbon) => k.status?.toLowerCase() === LUNAS;

export default function KasbonPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Kasbon[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cabang, setCabang] = useState("all");
  const [status, setStatus] = useState<"belum" | "lunas" | "all">("belum");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [settling, setSettling] = useState<Kasbon | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const handleUnauthorized = useCallback(async () => {
    toast.error("Your session has ended. Please log in again.");
    await fetch("/bff/logout", { method: "POST", credentials: "include" });
    localStorage.removeItem("user");
    router.replace("/login");
  }, [router]);

  const fetchKasbon = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "{}");
      const result = await fetch(`/bff/kasbon?id=${user._id}&cabang=${cabang}`);
      if (result.status === 401) return handleUnauthorized();
      const res = await result.json();
      if (!result.ok) throw new Error(res?.error || res?.message || "Gagal memuat kasbon");
      const list: Kasbon[] = res.data ?? [];
      list.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
      setRows(list);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [cabang, handleUnauthorized]);

  useEffect(() => {
    (async () => {
      const user = JSON.parse(localStorage.getItem("user") ?? "{}");
      const result = await fetch(`/bff/branch?id=${user._id}`);
      if (!result.ok) return;
      const res = await result.json();
      setBranches(Array.isArray(res.data) ? res.data : res.data?.items ?? []);
    })();
  }, []);

  useEffect(() => {
    fetchKasbon();
  }, [fetchKasbon]);

  useEffect(() => setPage(1), [search, cabang, status]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((k) => {
      if (status === "belum" && isLunas(k)) return false;
      if (status === "lunas" && !isLunas(k)) return false;
      if (!q) return true;
      return [k.memberName, k.memberId, k.noInvoice, k.memberPhone, k.note].some((v) => v?.toLowerCase().includes(q));
    });
  }, [rows, search, status]);

  const open = rows.filter((k) => !isLunas(k));
  const totalPiutang = open.reduce((a, k) => a + k.sisa, 0);
  const debtors = new Set(open.map((k) => k.membershipsId)).size;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const branchName = (id: string) => branches.find((b) => b._id === id)?.name ?? "-";

  const settle = async () => {
    if (!settling) return;
    setIsSettling(true);
    try {
      const result = await fetch(`/bff/kasbon/${settling._id}`, { method: "PUT" });
      if (result.status === 401) return handleUnauthorized();
      const res = await result.json();
      if (!result.ok) throw new Error(res?.error || "Gagal melunasi kasbon");
      setRows((rs) => rs.map((k) => (k._id === settling._id ? { ...k, status: LUNAS } : k)));
      toast.success(`Kasbon ${settling.memberName} lunas`);
      setSettling(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-5 flex items-center gap-3">
        <SidebarTrigger />
        <p className="text-xs text-gray-400">|</p>
        <div className="text-xs text-gray-400">Kasbon</div>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Kasbon</h1>
        <p className="mt-1 text-sm text-gray-500">Utang pelanggan dari transaksi kasbon</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-jax-limeDark via-jax-lime to-jax-leaf p-5 text-white shadow-md shadow-jax-lime/20">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="relative flex items-start justify-between">
            <div className="text-sm font-medium text-white/90">Total Piutang</div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <HandCoins className="h-5 w-5" />
            </div>
          </div>
          <div className="relative mt-1 text-2xl font-bold tracking-tight">{rupiah(totalPiutang)}</div>
          <div className="relative mt-1 text-xs text-white/80">Belum dibayar pelanggan</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="text-sm font-medium text-gray-500">Kasbon Aktif</div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{open.length.toLocaleString("id-ID")}</div>
          <div className="mt-1 text-xs text-gray-400">Dari {debtors} pelanggan</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="text-sm font-medium text-gray-500">Sudah Lunas</div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-jax-lime/10 text-jax-lime">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{(rows.length - open.length).toLocaleString("id-ID")}</div>
          <div className="mt-1 text-xs text-gray-400">Kasbon yang sudah dilunasi</div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1 lg:w-80">
            {([
              ["belum", "Belum lunas"],
              ["lunas", "Lunas"],
              ["all", "Semua"],
            ] as const).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setStatus(v)}
                className={`h-8 rounded-md text-xs font-semibold transition ${
                  status === v ? "bg-white text-jax-limeDark shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari pelanggan, no. invoice, atau catatan…"
              className="h-10 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-sm focus:border-jax-lime focus:outline-none"
            />
          </div>
          <select
            value={cabang}
            onChange={(e) => setCabang(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm lg:w-56"
          >
            <option value="all">Semua cabang</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-y border-gray-100 bg-gray-50/70">
              <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 font-medium">Pelanggan</th>
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium">Tanggal</th>
                <th className="px-5 py-3 font-medium">Cabang</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
                <th className="px-5 py-3 text-right font-medium">Sisa</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td colSpan={8} className="px-5 py-3">
                      <div className="flex animate-pulse items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gray-200" />
                        <div className="h-4 flex-1 rounded bg-gray-200" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : !paged.length ? (
                <TableEmpty
                  title={status === "belum" && !search ? "Tidak ada kasbon aktif" : "Kasbon tidak ditemukan"}
                  description={status === "belum" && !search ? "Semua pelanggan sudah melunasi utangnya" : "Coba ubah filter atau kata kunci"}
                />
              ) : (
                paged.map((k) => (
                  <tr key={k._id} className="border-b border-gray-100 transition-colors hover:bg-gray-50/70">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-jax-lime to-jax-leaf text-sm font-semibold text-white">
                          {k.memberName?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900">{k.memberName}</div>
                          <div className="max-w-[16rem] truncate text-xs text-gray-400">
                            {k.note || k.memberPhone || k.memberId || "-"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{k.noInvoice || "-"}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{fmtDate(k.date)}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{branchName(k.cabangId)}</td>
                    <td className="px-5 py-3 text-right text-sm text-gray-500">{rupiah(k.total)}</td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-gray-900">
                      {isLunas(k) ? "-" : rupiah(k.sisa)}
                    </td>
                    <td className="px-5 py-3">
                      {isLunas(k) ? (
                        <span className="inline-flex rounded-full bg-jax-lime/10 px-2 py-0.5 text-xs font-semibold text-jax-limeDark">
                          Lunas
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">
                          Belum lunas
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!isLunas(k) && (
                        <button
                          type="button"
                          onClick={() => setSettling(k)}
                          className="rounded-lg border border-jax-lime/40 px-3 py-1.5 text-xs font-semibold text-jax-limeDark hover:bg-jax-lime/10"
                        >
                          Lunasi
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <DataTablePagination
          page={Math.min(page, totalPages)}
          totalPages={totalPages}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />
      </div>

      {settling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={() => !isSettling && setSettling(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-jax-lime/10 text-jax-lime">
              <HandCoins className="h-6 w-6" />
            </div>
            <div className="mt-4 text-lg font-semibold text-gray-900">Lunasi kasbon?</div>
            <p className="mt-1 text-sm text-gray-500">
              Pastikan <span className="font-medium text-gray-900">{settling.memberName}</span> sudah membayar sisa kasbon
              sebesar:
            </p>
            <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-center text-2xl font-bold text-gray-900">
              {rupiah(settling.sisa)}
            </div>
            <div className="mt-1 text-center text-xs text-gray-400">{settling.noInvoice}</div>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isSettling}
                onClick={() => setSettling(null)}
                className="h-10 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSettling}
                onClick={settle}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-jax-lime text-sm font-semibold text-white hover:bg-jax-limeDark disabled:opacity-60"
              >
                {isSettling && <Loader2 className="h-4 w-4 animate-spin" />}
                Sudah Lunas
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
