 "use client";
import AppShell from '@/components/AppShell';
import SidebarTrigger from '@/components/SidebarTrigger';
import { useEffect, useState } from 'react';
import { useRouter } from "@/lib/useAppRouter";
import { toast } from 'sonner';
import ActionMenu from '@/components/ActionMenu';
import DataTablePagination from '@/components/DataTablePagination';
import { Stock } from '../manage/product/page';
import {
  Wallet,
  Receipt,
  Package,
  Boxes,
  TrendingUp,
  CalendarDays,
  RefreshCw,
  ImageOff,
} from 'lucide-react';

const rupiah = (n: number) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const compact = (n: number) =>
  n >= 1_000_000_000
    ? `${+(n / 1_000_000_000).toFixed(1)} M`
    : n >= 1_000_000
    ? `${+(n / 1_000_000).toFixed(1)} jt`
    : n >= 1_000
    ? `${+(n / 1_000).toFixed(1)} rb`
    : `${n}`;

/** round the max up to a "nice" number so the y axis has clean ticks */
const niceMax = (n: number) => {
  if (n <= 0) return 4;
  const mag = 10 ** Math.floor(Math.log10(n));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * mag >= n)!;
  return step * mag;
};

export default function DashboardPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Stock[]>([]);
  const [dashboard, setDashboard] = useState<any>([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const pagedProducts = products.slice((page - 1) * pageSize, page * pageSize);

  const fetchDashboard = async () => {
    setIsLoadingDashboard(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      const result = await fetch(`/bff/dashboard?id=${user._id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (result.status === 401) {
        toast.error('Your session has ended. Please log in again.');
        await fetch('/bff/logout', { method: 'POST', credentials: 'include' });
        localStorage.removeItem('user');
        router.replace('/login');
        return;
      }

      const res = await result.json();
      if (!result.ok) throw new Error(res?.error || 'Failed to load data');
      
      const data = res.data;


      setDashboard(data);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const handleDelete = (id: string, idProduct: string) => {
    toast('Yakin ingin menghapus data ini?', {
      description: 'Data yang dihapus tidak dapat dikembalikan.',
      duration: Infinity,
      action: {
        label: 'Hapus',
        onClick: async () => {
          try {
            await fetch(`/bff/stock/${id}?idProduct=${idProduct}`, {
              method: 'DELETE',
            });
            toast.success('Data successfully deleted');
            fetchProducts();
          } catch (err) {
            toast.error('Failed to delete data');
          }
        },
      },
      cancel: { label: 'Batal', onClick: () => {} },
    });
  };

  const actionRows = (id: string, idProduct: string) => {
    return (
      <ActionMenu
        anchorEl={menuAnchor}
        onClose={() => {
          setOpenActionId(null);
          setMenuAnchor(null);
        }}
        items={[
          { label: 'Edit', onClick: () => router.push(`/manage/product/${id}/edit`) },
          { label: 'Hapus', destructive: true, onClick: () => handleDelete(id, idProduct) },
        ]}
      />
    );
  };

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      const result = await fetch(`/bff/stock?id=${user._id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (result.status === 401) {
        toast.error('Your session has ended. Please log in again.');
        await fetch('/bff/logout', { method: 'POST', credentials: 'include' });
        localStorage.removeItem('user');
        router.replace('/login');
        return;
      }

      const res = await result.json();
      if (!result.ok) throw new Error(res?.error || 'Failed to load data');

      setProducts(res.data);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const daily: { day: string; total: number }[] = dashboard?.pendapatanPerHari ?? [];
  const weekTotal = daily.reduce((a, d) => a + Number(d.total || 0), 0);
  const maxSales = Math.max(0, ...daily.map((d) => Number(d.total || 0)));
  const yMax = niceMax(maxSales);
  const yTicks = [yMax, yMax * 0.75, yMax * 0.5, yMax * 0.25, 0];
  const bestDay = maxSales > 0 ? daily.find((d) => Number(d.total) === maxSales) : undefined;

  const stats = [
    {
      title: 'Total Pemasukan',
      value: rupiah(dashboard.totalPemasukan2Bulan),
      subtitle: '2 bulan terakhir',
      icon: Wallet,
    },
    {
      title: 'Transaksi Berhasil',
      value: Number(dashboard.totalTransaksi2Bulan || 0).toLocaleString('id-ID'),
      subtitle: '2 bulan terakhir',
      icon: Receipt,
    },
    {
      title: 'Stok Cabang Pusat',
      value: Number(dashboard.totalStokCabangPusat || 0).toLocaleString('id-ID'),
      subtitle: `Dari ${dashboard.totalProdukCabangPusat || 0} produk`,
      icon: Package,
    },
    {
      title: 'Total Seluruh Stok',
      value: Number(dashboard.totalStok || 0).toLocaleString('id-ID'),
      subtitle: `Dari ${dashboard.totalCabang || 0} cabang`,
      icon: Boxes,
    },
  ];

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    fetchDashboard();
    fetchProducts();
  }, [router]);

  return (
    <AppShell>
      {/* Breadcrumb */}
      <div className="mb-5 flex items-center gap-3">
        <SidebarTrigger />
        <p className="text-xs text-gray-400">|</p>
        <div className="text-xs text-gray-400">Dashboard</div>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
            <CalendarDays className="h-4 w-4" />
            {today}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            fetchDashboard();
            fetchProducts();
          }}
          disabled={isLoadingDashboard || isLoadingProducts}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isLoadingDashboard || isLoadingProducts ? 'animate-spin' : ''}`} />
          Muat ulang
        </button>
      </div>

      {/* KPI cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          const hero = i === 0;
          return (
            <div
              key={s.title}
              className={
                hero
                  ? 'relative overflow-hidden rounded-2xl bg-gradient-to-br from-jax-limeDark via-jax-lime to-jax-leaf p-5 text-white shadow-md shadow-jax-lime/20'
                  : 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm'
              }
            >
              {hero && (
                <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
              )}
              <div className="relative flex items-start justify-between">
                <div className={`text-sm font-medium ${hero ? 'text-white/90' : 'text-gray-500'}`}>{s.title}</div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    hero ? 'bg-white/20 text-white' : 'bg-jax-lime/10 text-jax-lime'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              {isLoadingDashboard ? (
                <div className={`mt-2 h-8 w-32 animate-pulse rounded-md ${hero ? 'bg-white/25' : 'bg-gray-200'}`} />
              ) : (
                <div className={`relative mt-1 text-2xl font-bold tracking-tight ${hero ? '' : 'text-gray-900'}`}>
                  {s.value}
                </div>
              )}
              <div className={`relative mt-1 text-xs ${hero ? 'text-white/80' : 'text-gray-400'}`}>{s.subtitle}</div>
            </div>
          );
        })}
      </div>

      {/* Chart + weekly */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-base font-semibold text-gray-900">Ringkasan Penjualan</div>
              <div className="text-xs text-gray-400">Pendapatan harian minggu ini</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Total minggu ini</div>
              <div className="text-lg font-bold text-gray-900">{rupiah(weekTotal)}</div>
            </div>
          </div>

          <div className="mt-6 flex h-64">
            {/* Y axis */}
            <div className="flex w-12 flex-col justify-between pb-6 pr-2 text-right text-[11px] text-gray-400">
              {yTicks.map((v) => (
                <div key={v} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
                  {compact(v)}
                </div>
              ))}
            </div>

            {/* Plot */}
            <div className="relative flex-1">
              <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
                {yTicks.map((v) => (
                  <div key={v} className="border-t border-dashed border-gray-100" />
                ))}
              </div>
              <div className="absolute inset-0 flex items-end justify-around gap-2">
                {isLoadingDashboard
                  ? Array.from({ length: 7 }).map((_, i) => (
                      <div key={i} className="flex h-full w-full flex-col items-center justify-end gap-2">
                        <div
                          className="w-8 animate-pulse rounded-t-lg bg-gray-100"
                          style={{ height: `${30 + ((i * 37) % 60)}%` }}
                        />
                        <div className="h-4" />
                      </div>
                    ))
                  : daily.map((d) => {
                      const pct = (Number(d.total || 0) / yMax) * 100;
                      return (
                        <div key={d.day} className="group flex h-full w-full flex-col items-center justify-end">
                          <div className="relative flex w-full flex-1 items-end justify-center">
                            <div
                              className="relative w-8 rounded-t-lg bg-gradient-to-t from-jax-lime to-jax-leaf transition-all duration-500 group-hover:from-jax-limeDark group-hover:to-jax-lime"
                              style={{ height: `max(${pct}%, 4px)` }}
                            >
                              <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow transition-opacity group-hover:opacity-100">
                                {rupiah(d.total)}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 h-4 text-[11px] text-gray-500">{d.day.slice(0, 3)}</div>
                        </div>
                      );
                    })}
              </div>
            </div>
          </div>
        </div>

        {/* Weekly breakdown */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-base font-semibold text-gray-900">Pendapatan per Hari</div>
              <div className="text-xs text-gray-400">
                {bestDay ? (
                  <>
                    Tertinggi: <span className="font-medium text-jax-lime">{bestDay.day}</span>
                  </>
                ) : (
                  'Belum ada penjualan minggu ini'
                )}
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-jax-lime/10 text-jax-lime">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 space-y-3.5">
            {isLoadingDashboard
              ? Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-7 animate-pulse rounded bg-gray-100" />
                ))
              : daily.map((d) => {
                  const pct = maxSales > 0 ? (Number(d.total || 0) / maxSales) * 100 : 0;
                  const isBest = bestDay?.day === d.day;
                  return (
                    <div key={d.day}>
                      <div className="flex items-center justify-between text-sm">
                        <span className={isBest ? 'font-semibold text-gray-900' : 'text-gray-600'}>{d.day}</span>
                        <span className="font-medium text-gray-900">{rupiah(d.total)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-jax-lime to-jax-leaf transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      </div>

      {/* Pengelolaan Barang Cabang */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-5 pt-5">
          <div>
            <div className="text-base font-semibold text-gray-900">Pengelolaan Barang Cabang</div>
            <div className="text-xs text-gray-400">Stok produk di semua cabang</div>
          </div>
          <button
            type="button"
            onClick={() => router.push('/manage/product')}
            className="text-sm font-medium text-jax-lime hover:text-jax-limeDark"
          >
            Lihat semua →
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-y border-gray-100 bg-gray-50/70">
              <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 font-medium">Produk</th>
                <th className="px-5 py-3 font-medium">Kategori</th>
                <th className="px-5 py-3 font-medium">Merk</th>
                <th className="px-5 py-3 font-medium">Cabang</th>
                <th className="px-5 py-3 text-right font-medium">Qty</th>
                <th className="px-5 py-3 text-right font-medium">Harga Jual</th>
                <th className="px-5 py-3 text-right font-medium">Harga Beli</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {isLoadingProducts ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-5 py-3" colSpan={8}>
                      <div className="flex animate-pulse items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gray-200" />
                        <div className="h-4 flex-1 rounded bg-gray-200" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : !products.length ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <Package className="mx-auto h-10 w-10 text-gray-300" />
                    <div className="mt-2 text-sm font-medium text-gray-600">Belum ada data produk</div>
                    <div className="text-xs text-gray-400">Produk yang ditambahkan akan muncul di sini</div>
                  </td>
                </tr>
              ) : (
                pagedProducts.map((p) => (
                  <tr key={p._id ?? p.code} className="border-b border-gray-100 transition-colors hover:bg-gray-50/70">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                          {p.produk?.file ? (
                            <img src={p.produk.file} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <ImageOff className="h-4 w-4 text-gray-300" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{p.name}</div>
                          <div className="text-xs text-gray-400">{p.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">{p.produkKategori?.name ?? '-'}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{p.produkMerk?.name ?? '-'}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{p.cabang?.name ?? '-'}</td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.qty <= 0
                            ? 'bg-red-50 text-red-600'
                            : p.qty < 10
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-jax-lime/10 text-jax-limeDark'
                        }`}
                      >
                        {p.qty}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-gray-900">{rupiah(p.harga)}</td>
                    <td className="px-5 py-3 text-right text-sm text-gray-500">{rupiah(p.hargaModal)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={(e) => {
                            const next = openActionId === p._id ? null : p._id;
                            setOpenActionId(next);
                            setMenuAnchor(next ? (e.currentTarget as HTMLElement) : null);
                          }}
                          className="rounded-lg px-2 py-1 text-gray-600 hover:bg-gray-100"
                          aria-label="Row actions"
                        >
                          <span className="text-lg leading-none">…</span>
                        </button>
                        {openActionId === p._id && actionRows(p._id, p.produkId ?? '')}
                      </div>
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
          total={products.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>
    </AppShell>
  );
}
