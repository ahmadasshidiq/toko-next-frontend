import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function auth() {
  const token = (await cookies()).get("token")?.value;
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : null;
}

/** GET /bff/membership?id=<owner>&cabang=<cabangId|all> */
export async function GET(req: Request) {
  const headers = await auth();
  if (!headers) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const idOwner = searchParams.get("id");
  if (!idOwner) return NextResponse.json({ error: "Parameter not found" }, { status: 400 });

  const cabang = searchParams.get("cabang") || "all";
  const response = await fetch(
    `${process.env.API_BASE_URL}/memberships/${idOwner}/get-by-owner/${cabang}/cabang`,
    { headers, cache: "no-store" }
  );
  const res = await response.json().catch(() => ({}));
  if (!response.ok) return NextResponse.json(res, { status: response.status });

  return NextResponse.json({ data: res?.data ?? [] }, { status: 200 });
}

/**
 * POST /bff/membership — tambah member baru.
 * Backend tidak punya endpoint create khusus; member dibuat lewat /sync/transaksi (pelanggan).
 */
export async function POST(req: Request) {
  const headers = await auth();
  if (!headers) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body?.name?.trim() || !body?.cabangId) {
    return NextResponse.json({ error: "Nama dan cabang wajib diisi" }, { status: 400 });
  }

  const pelanggan = {
    clientId: body.clientId,
    cabangId: body.cabangId,
    memberId: body.memberId ?? "",
    nik: body.nik ?? "",
    name: body.name.trim(),
    email: body.email ?? "",
    phone: body.phone ?? "",
    address: body.address ?? "",
    poin: 0,
  };

  const response = await fetch(`${process.env.API_BASE_URL}/sync/transaksi`, {
    method: "POST",
    headers,
    body: JSON.stringify({ pelanggan: [pelanggan], transaksi: [], kasbon: [], rekapKas: [] }),
  });
  const res = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(
      { error: res?.message || res?.error || "Gagal menyimpan member" },
      { status: response.status }
    );
  }
  const rejected = res?.data?.rejected ?? [];
  if (rejected.length) {
    return NextResponse.json({ error: rejected[0]?.reason ?? "Member ditolak" }, { status: 422 });
  }
  return NextResponse.json({ data: { clientId: pelanggan.clientId } }, { status: 200 });
}
