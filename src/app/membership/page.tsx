"use client";

import AppShell from "@/components/AppShell";
import SidebarTrigger from "@/components/SidebarTrigger";
import DataTablePagination from "@/components/DataTablePagination";
import TableEmpty from "@/components/TableEmpty";
import MemberFormModal, { type Member } from "@/components/MemberFormModal";
import { useRouter } from "@/lib/useAppRouter";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Star, Users } from "lucide-react";
import type { Branch } from "../manage/branch/page";

export default function MembershipPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cabang, setCabang] = useState("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const handleUnauthorized = useCallback(async () => {
    toast.error("Your session has ended. Please log in again.");
    await fetch("/bff/logout", { method: "POST", credentials: "include" });
    localStorage.removeItem("user");
    router.replace("/login");
  }, [router]);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "{}");
      const result = await fetch(`/bff/membership?id=${user._id}&cabang=${cabang}`);
      if (result.status === 401) return handleUnauthorized();
      const res = await result.json();
      if (!result.ok) throw new Error(res?.error || res?.message || "Gagal memuat member");
      setMembers(res.data ?? []);
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
    fetchMembers();
  }, [fetchMembers]);

  const branchName = (id: string) => branches.find((b) => b._id === id)?.name ?? "-";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      [m.name, m.memberId, m.phone, m.email].some((v) => v?.toLowerCase().includes(q))
    );
  }, [members, search]);

  useEffect(() => setPage(1), [search, cabang]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPoin = members.reduce((a, m) => a + (m.poin || 0), 0);

  return (
    <AppShell>
      <div className="mb-5 flex items-center gap-3">
        <SidebarTrigger />
        <p className="text-xs text-gray-400">|</p>
        <div className="text-xs text-gray-400">Membership</div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Membership</h1>
          <p className="mt-1 text-sm text-gray-500">Daftar pelanggan terdaftar dan poin mereka</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-jax-lime px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-jax-limeDark sm:self-auto"
        >
          <Plus className="h-4 w-4" /> Tambah Member
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-jax-lime/10 text-jax-lime">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm text-gray-500">Total Member</div>
            <div className="text-2xl font-bold text-gray-900">{members.length.toLocaleString("id-ID")}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
            <Star className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm text-gray-500">Total Poin Beredar</div>
            <div className="text-2xl font-bold text-gray-900">{totalPoin.toLocaleString("id-ID")}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, no. member, HP, atau email…"
              className="h-10 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-sm focus:border-jax-lime focus:outline-none"
            />
          </div>
          <select
            value={cabang}
            onChange={(e) => setCabang(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm sm:w-56"
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
                <th className="px-5 py-3 font-medium">Member</th>
                <th className="px-5 py-3 font-medium">No. HP</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Cabang</th>
                <th className="px-5 py-3 text-right font-medium">Poin</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td colSpan={5} className="px-5 py-3">
                      <div className="flex animate-pulse items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gray-200" />
                        <div className="h-4 flex-1 rounded bg-gray-200" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : !paged.length ? (
                <TableEmpty
                  title={search ? "Member tidak ditemukan" : "Belum ada member"}
                  description={search ? "Coba kata kunci lain" : "Tambahkan member dari tombol di atas atau dari Kasir"}
                />
              ) : (
                paged.map((m) => (
                  <tr key={m._id ?? m.clientId} className="border-b border-gray-100 transition-colors hover:bg-gray-50/70">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-jax-lime to-jax-leaf text-sm font-semibold text-white">
                          {m.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{m.name}</div>
                          <div className="text-xs text-gray-400">{m.memberId || "-"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">{m.phone || "-"}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{m.email || "-"}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{branchName(m.cabangId)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">
                        <Star className="h-3 w-3" /> {(m.poin || 0).toLocaleString("id-ID")}
                      </span>
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

      <MemberFormModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={() => fetchMembers()}
        branches={branches}
        defaultCabangId={cabang !== "all" ? cabang : undefined}
      />
    </AppShell>
  );
}
