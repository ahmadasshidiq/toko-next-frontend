"use client";

import AppShell from "@/components/AppShell";
import SidebarTrigger from "@/components/SidebarTrigger";
import { useRouter } from "@/lib/useAppRouter";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  ImageOff,
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  Store,
  CheckCircle2,
  Printer,
  Loader2,
  PackageSearch,
} from "lucide-react";
import type { Stock } from "../manage/product/page";
import type { Branch } from "../manage/branch/page";

type CartItem = {
  stokId: string;
  produkId: string;
  code: string;
  name: string;
  harga: number;
  qty: number;
  stock: number;
  image?: string;
};

type Receipt = {
  noInvoice: string;
  date: string;
  cabang: string;
  name: string;
  items: CartItem[];
  subTotal: number;
  discount: number;
  total: number;
  bayar: number;
  kembalian: number;
};

const rupiah = (n: number) => `Rp ${Math.round(n || 0).toLocaleString("id-ID")}`;
const pad = (n: number) => String(n).padStart(2, "0");

/** INV-YYYYMMDD-HHMMSS-XXX */
const makeInvoice = () => {
  const d = new Date();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `INV-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(
    d.getMinutes()
  )}${pad(d.getSeconds())}-${rand}`;
};

/** RFC3339 waktu lokal, mis. 2026-11-23T14:05:09+07:00 (format yang dipakai dashboard & laporan backend) */
const nowRFC3339 = (d: Date) => {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const tz = `${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}${tz}`;
};

const newClientId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function KasirPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cabangId, setCabangId] = useState("");
  const [products, setProducts] = useState<Stock[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState("");
  const [discountUnit, setDiscountUnit] = useState<"rp" | "%">("rp");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [bayar, setBayar] = useState(0);
  const [isPaying, setIsPaying] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  // dipakai ulang bila request gagal di tengah jalan, supaya tidak dobel tersimpan
  const pendingClientId = useRef<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const handleUnauthorized = useCallback(async () => {
    toast.error("Your session has ended. Please log in again.");
    await fetch("/bff/logout", { method: "POST", credentials: "include" });
    localStorage.removeItem("user");
    router.replace("/login");
  }, [router]);

  // cabang
  useEffect(() => {
    (async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user") ?? "{}");
        const result = await fetch(`/bff/branch?id=${user._id}`);
        if (result.status === 401) return handleUnauthorized();
        const res = await result.json();
        if (!result.ok) throw new Error(res?.error || "Gagal memuat cabang");
        const list: Branch[] = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
        setBranches(list);
        const saved = localStorage.getItem("kasir:cabang");
        setCabangId(list.find((b) => b._id === saved)?._id ?? list[0]?._id ?? "");
      } catch (err) {
        toast.error((err as Error).message);
      }
    })();
  }, [handleUnauthorized]);

  // produk per cabang + pencarian (debounce)
  useEffect(() => {
    if (!cabangId) return;
    const t = setTimeout(async () => {
      setIsLoadingProducts(true);
      try {
        const user = JSON.parse(localStorage.getItem("user") ?? "{}");
        const qs = new URLSearchParams({ id: user._id, cabang: cabangId, page: "1", limit: "60" });
        if (search.trim()) qs.set("search", search.trim());
        const result = await fetch(`/bff/stock?${qs}`);
        if (result.status === 401) return handleUnauthorized();
        const res = await result.json();
        if (!result.ok) throw new Error(res?.error || "Gagal memuat produk");
        setProducts(Array.isArray(res.data) ? res.data : res.data?.items ?? []);
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        setIsLoadingProducts(false);
      }
    }, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [cabangId, search, handleUnauthorized]);

  const changeBranch = (id: string) => {
    if (cart.length && !confirm("Ganti cabang akan mengosongkan keranjang. Lanjutkan?")) return;
    setCart([]);
    setCabangId(id);
    localStorage.setItem("kasir:cabang", id);
  };

  const addToCart = (p: Stock) => {
    setCart((c) => {
      const existing = c.find((i) => i.stokId === p._id);
      if (existing) {
        if (existing.qty >= p.qty) {
          toast.warning(`Stok ${p.name} tersisa ${p.qty}`);
        }
        return c.map((i) => (i.stokId === p._id ? { ...i, qty: i.qty + 1 } : i));
      }
      if (p.qty <= 0) toast.warning(`Stok ${p.name} habis`);
      return [
        ...c,
        {
          stokId: p._id,
          produkId: p.produkId ?? "",
          code: p.code,
          name: p.name,
          harga: p.harga,
          qty: 1,
          stock: p.qty,
          image: p.produk?.file || p.imageDataUrl,
        },
      ];
    });
  };

  const setQty = (stokId: string, qty: number) =>
    setCart((c) => (qty <= 0 ? c.filter((i) => i.stokId !== stokId) : c.map((i) => (i.stokId === stokId ? { ...i, qty } : i))));

  const subTotal = useMemo(() => cart.reduce((a, i) => a + i.harga * i.qty, 0), [cart]);
  const discount = useMemo(() => {
    if (!discountAmount) return 0;
    const d = discountUnit === "%" ? Math.floor((Math.min(discountAmount, 100) * subTotal) / 100) : discountAmount;
    return Math.min(d, subTotal);
  }, [discountAmount, discountUnit, subTotal]);
  const total = subTotal - discount;
  const kembalian = bayar - total;
  const itemCount = cart.reduce((a, i) => a + i.qty, 0);

  const quickCash = useMemo(() => {
    if (total <= 0) return [];
    const opts = new Set<number>([total]);
    for (const step of [5_000, 10_000, 20_000, 50_000, 100_000]) {
      const v = Math.ceil(total / step) * step;
      if (v > total) opts.add(v);
    }
    return Array.from(opts).sort((a, b) => a - b).slice(0, 4);
  }, [total]);

  const resetSale = () => {
    setCart([]);
    setCustomer("");
    setDiscountAmount(0);
    setBayar(0);
    pendingClientId.current = null;
    searchRef.current?.focus();
  };

  const pay = async () => {
    if (!cart.length) return toast.error("Keranjang masih kosong");
    if (bayar < total) return toast.error("Jumlah bayar kurang dari total");

    setIsPaying(true);
    const clientId = (pendingClientId.current ??= newClientId());
    const noInvoice = makeInvoice();
    const now = new Date();
    const date = nowRFC3339(now);
    try {
      const result = await fetch("/bff/kasir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          noInvoice,
          cabangId,
          name: customer.trim() || "Umum",
          date,
          discountName: discount ? "Diskon" : "",
          discountUnit: discount ? discountUnit : "",
          discountAmount: discount ? discountAmount : 0,
          jumlahPembayaran: bayar,
          kembalian: bayar - total,
          metode: "cash",
          items: cart.map((i) => ({
            stokId: i.stokId,
            produkId: i.produkId,
            code: i.code,
            name: i.name,
            harga: i.harga,
            qty: i.qty,
          })),
        }),
      });
      if (result.status === 401) return handleUnauthorized();
      const res = await result.json();
      if (!result.ok) throw new Error(res?.error || "Gagal menyimpan transaksi");

      setReceipt({
        noInvoice,
        date: now.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }),
        cabang: branches.find((b) => b._id === cabangId)?.name ?? "",
        name: customer.trim() || "Umum",
        items: cart,
        subTotal,
        discount,
        total,
        bayar,
        kembalian: bayar - total,
      });
      // kurangi stok di tampilan tanpa reload
      setProducts((ps) =>
        ps.map((p) => {
          const it = cart.find((i) => i.stokId === p._id);
          return it ? { ...p, qty: p.qty - it.qty } : p;
        })
      );
      resetSale();
      toast.success("Transaksi berhasil disimpan");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-5 flex items-center gap-3">
        <SidebarTrigger />
        <p className="text-xs text-gray-400">|</p>
        <div className="text-xs text-gray-400">Kasir</div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Kasir</h1>
          <p className="mt-1 text-sm text-gray-500">Pilih produk, atur jumlah, lalu proses pembayaran</p>
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm">
          <Store className="h-4 w-4 text-jax-lime" />
          <select
            value={cabangId}
            onChange={(e) => changeBranch(e.target.value)}
            className="bg-transparent pr-1 text-sm font-medium focus:outline-none"
          >
            {!branches.length && <option value="">Memuat cabang…</option>}
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Produk */}
        <div className="xl:col-span-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau kode produk…"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm shadow-sm focus:border-jax-lime focus:outline-none focus:ring-2 focus:ring-jax-lime/20"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {isLoadingProducts && !products.length
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="aspect-square rounded-xl bg-gray-100" />
                    <div className="mt-3 h-4 w-3/4 rounded bg-gray-100" />
                    <div className="mt-2 h-4 w-1/2 rounded bg-gray-100" />
                  </div>
                ))
              : products.map((p) => {
                  const inCart = cart.find((i) => i.stokId === p._id)?.qty ?? 0;
                  const img = p.produk?.file || p.imageDataUrl;
                  return (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => addToCart(p)}
                      className={`group relative rounded-2xl border bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                        inCart ? "border-jax-lime ring-2 ring-jax-lime/20" : "border-gray-200"
                      }`}
                    >
                      {inCart > 0 && (
                        <span className="absolute right-2 top-2 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-jax-lime px-1.5 text-xs font-bold text-white shadow">
                          {inCart}
                        </span>
                      )}
                      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-gray-50">
                        {img ? (
                          <img src={img} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <ImageOff className="h-6 w-6 text-gray-300" />
                        )}
                      </div>
                      <div className="mt-3 line-clamp-2 text-sm font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.code}</div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-sm font-bold text-jax-limeDark">{rupiah(p.harga)}</span>
                        <span
                          className={`text-[11px] font-medium ${
                            p.qty <= 0 ? "text-red-500" : p.qty < 10 ? "text-amber-500" : "text-gray-400"
                          }`}
                        >
                          Stok {p.qty}
                        </span>
                      </div>
                    </button>
                  );
                })}
          </div>

          {!isLoadingProducts && !products.length && (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
              <PackageSearch className="mx-auto h-10 w-10 text-gray-300" />
              <div className="mt-2 text-sm font-medium text-gray-600">
                {search ? "Produk tidak ditemukan" : "Belum ada produk di cabang ini"}
              </div>
            </div>
          )}
        </div>

        {/* Keranjang */}
        <div className="xl:sticky xl:top-6 xl:self-start">
          <div className="flex max-h-[calc(100vh-3rem)] flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-jax-lime" />
                <span className="text-base font-semibold text-gray-900">Keranjang</span>
                {itemCount > 0 && (
                  <span className="rounded-full bg-jax-lime/10 px-2 py-0.5 text-xs font-semibold text-jax-limeDark">
                    {itemCount} item
                  </span>
                )}
              </div>
              {cart.length > 0 && (
                <button type="button" onClick={() => setCart([])} className="text-xs font-medium text-red-500 hover:text-red-600">
                  Kosongkan
                </button>
              )}
            </div>

            <div className="min-h-[120px] flex-1 overflow-y-auto px-5">
              {!cart.length ? (
                <div className="py-10 text-center text-sm text-gray-400">Klik produk untuk menambahkan</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {cart.map((i) => (
                    <li key={i.stokId} className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-gray-900">{i.name}</div>
                          <div className="text-xs text-gray-400">{rupiah(i.harga)}</div>
                          {i.qty > i.stock && <div className="text-[11px] text-amber-600">Melebihi stok ({i.stock})</div>}
                        </div>
                        <div className="text-sm font-semibold text-gray-900">{rupiah(i.harga * i.qty)}</div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded-lg border border-gray-200">
                          <button
                            type="button"
                            aria-label="Kurangi"
                            onClick={() => setQty(i.stokId, i.qty - 1)}
                            className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-50"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={i.qty}
                            onChange={(e) => setQty(i.stokId, Math.max(0, Number(e.target.value) || 0))}
                            className="h-7 w-12 border-x border-gray-200 text-center text-sm [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            aria-label="Tambah"
                            onClick={() => setQty(i.stokId, i.qty + 1)}
                            className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-50"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          aria-label="Hapus"
                          onClick={() => setQty(i.stokId, 0)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3 border-t border-gray-100 px-5 py-4">
              <input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Nama pelanggan (opsional)"
                className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-jax-lime focus:outline-none"
              />
              <div className="flex gap-2">
                <div className="flex overflow-hidden rounded-lg border border-gray-200 text-xs font-medium">
                  {(["rp", "%"] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setDiscountUnit(u)}
                      className={`px-3 ${discountUnit === u ? "bg-jax-lime text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                    >
                      {u === "rp" ? "Rp" : "%"}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={0}
                  value={discountAmount || ""}
                  onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="Diskon"
                  className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-jax-lime focus:outline-none"
                />
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>{rupiah(subTotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Diskon</span>
                    <span className="text-red-500">- {rupiah(discount)}</span>
                  </div>
                )}
                <div className="flex items-end justify-between pt-1">
                  <span className="font-medium text-gray-900">Total</span>
                  <span className="text-2xl font-bold tracking-tight text-gray-900">{rupiah(total)}</span>
                </div>
              </div>

              <div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rp</span>
                  <input
                    type="number"
                    min={0}
                    value={bayar || ""}
                    onChange={(e) => setBayar(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="Jumlah bayar (tunai)"
                    className="h-10 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-sm font-medium focus:border-jax-lime focus:outline-none"
                  />
                </div>
                {quickCash.length > 0 && (
                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {quickCash.map((v, idx) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setBayar(v)}
                        className={`rounded-lg border px-1 py-1.5 text-[11px] font-medium transition ${
                          bayar === v
                            ? "border-jax-lime bg-jax-lime/10 text-jax-limeDark"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {idx === 0 ? "Uang pas" : `${(v / 1000).toLocaleString("id-ID")}rb`}
                      </button>
                    ))}
                  </div>
                )}
                {bayar > 0 && (
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-gray-500">Kembalian</span>
                    <span className={`font-semibold ${kembalian < 0 ? "text-red-500" : "text-jax-limeDark"}`}>
                      {kembalian < 0 ? `Kurang ${rupiah(-kembalian)}` : rupiah(kembalian)}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={pay}
                disabled={!cart.length || bayar < total || isPaying || !cabangId}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-jax-limeDark to-jax-lime text-base font-semibold text-white shadow-md shadow-jax-lime/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {isPaying ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {isPaying ? "Memproses…" : `Bayar ${total > 0 ? rupiah(total) : ""}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Struk */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:static print:bg-white print:p-0">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl print:max-w-none print:rounded-none print:shadow-none">
            <div className="text-center print:hidden">
              <CheckCircle2 className="mx-auto h-12 w-12 text-jax-lime" />
              <div className="mt-2 text-lg font-semibold text-gray-900">Pembayaran Berhasil</div>
            </div>

            <div id="struk" className="mt-4 border-t border-dashed border-gray-300 pt-4 font-mono text-xs text-gray-700">
              <div className="text-center">
                <div className="text-sm font-bold">TOKO</div>
                <div>{receipt.cabang}</div>
              </div>
              <div className="mt-3 space-y-0.5">
                <div className="flex justify-between"><span>No</span><span>{receipt.noInvoice}</span></div>
                <div className="flex justify-between"><span>Tanggal</span><span>{receipt.date}</span></div>
                <div className="flex justify-between"><span>Pelanggan</span><span>{receipt.name}</span></div>
              </div>
              <div className="my-3 border-t border-dashed border-gray-300" />
              {receipt.items.map((i) => (
                <div key={i.stokId} className="mb-1">
                  <div>{i.name}</div>
                  <div className="flex justify-between">
                    <span>{i.qty} x {i.harga.toLocaleString("id-ID")}</span>
                    <span>{(i.qty * i.harga).toLocaleString("id-ID")}</span>
                  </div>
                </div>
              ))}
              <div className="my-3 border-t border-dashed border-gray-300" />
              <div className="space-y-0.5">
                <div className="flex justify-between"><span>Subtotal</span><span>{rupiah(receipt.subTotal)}</span></div>
                {receipt.discount > 0 && (
                  <div className="flex justify-between"><span>Diskon</span><span>-{rupiah(receipt.discount)}</span></div>
                )}
                <div className="flex justify-between text-sm font-bold"><span>Total</span><span>{rupiah(receipt.total)}</span></div>
                <div className="flex justify-between"><span>Tunai</span><span>{rupiah(receipt.bayar)}</span></div>
                <div className="flex justify-between"><span>Kembali</span><span>{rupiah(receipt.kembalian)}</span></div>
              </div>
              <div className="mt-4 text-center">Terima kasih!</div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Printer className="h-4 w-4" /> Cetak
              </button>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="h-10 rounded-lg bg-jax-lime text-sm font-semibold text-white hover:bg-jax-limeDark"
              >
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
