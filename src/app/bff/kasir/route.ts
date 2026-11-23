import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Simpan transaksi kasir web lewat endpoint sync backend
 * (menyimpan item, mengurangi stok, idempotent per clientId).
 */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const transaksi = await req.json();
  const response = await fetch(`${process.env.API_BASE_URL}/sync/transaksi`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pelanggan: [], transaksi: [transaksi], kasbon: [], rekapKas: [] }),
  });

  const res = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(
      { error: res?.message || res?.error || "Gagal menyimpan transaksi" },
      { status: response.status }
    );
  }

  const rejected = res?.data?.rejected ?? res?.data?.Rejected ?? [];
  if (rejected.length) {
    return NextResponse.json(
      { error: rejected[0]?.reason ?? rejected[0]?.Reason ?? "Transaksi ditolak" },
      { status: 422 }
    );
  }

  return NextResponse.json({ data: res?.data ?? null }, { status: 200 });
}
