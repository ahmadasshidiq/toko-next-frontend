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

  // body: transaksi, opsional { ...transaksi, kasbon: {...} } untuk penjualan kasbon
  const { kasbon, ...transaksi } = await req.json();
  const response = await fetch(`${process.env.API_BASE_URL}/sync/transaksi`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pelanggan: [], transaksi: [transaksi], kasbon: kasbon ? [kasbon] : [], rekapKas: [] }),
  });

  const res = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(
      { error: res?.message || res?.error || "Gagal menyimpan transaksi" },
      { status: response.status }
    );
  }

  const rejected: { clientId: string; reason: string }[] = res?.data?.rejected ?? [];
  const trxRejected = rejected.find((r) => r.clientId === transaksi.clientId);
  if (trxRejected) {
    return NextResponse.json({ error: trxRejected.reason ?? "Transaksi ditolak" }, { status: 422 });
  }
  // transaksi tersimpan tapi kasbon gagal: kirim ulang dengan clientId yang sama aman (idempotent)
  if (rejected.length) {
    return NextResponse.json(
      { error: `Transaksi tersimpan, tapi kasbon gagal: ${rejected[0].reason}` },
      { status: 422 }
    );
  }

  return NextResponse.json({ data: res?.data ?? null }, { status: 200 });
}
