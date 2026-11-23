import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * GET /bff/kasbon?id=<owner>&cabang=<cabangId|all>
 * Kasbon dari backend hanya menyimpan id transaksi & member, jadi dilengkapi dengan
 * nominal transaksi (total, dibayar, sisa) dan data member.
 */
export async function GET(req: Request) {
  const token = (await cookies()).get("token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const idOwner = searchParams.get("id");
  if (!idOwner) return NextResponse.json({ error: "Parameter not found" }, { status: 400 });
  const cabang = searchParams.get("cabang") || "all";

  const base = process.env.API_BASE_URL;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const get = (path: string) => fetch(`${base}${path}`, { headers, cache: "no-store" });

  const [kasbonRes, trxRes, memberRes] = await Promise.all([
    get(`/kasbon/${idOwner}/get-by-owner/${cabang}/cabang`),
    get(`/transaksi/${idOwner}/get-by-owner/${cabang}/cabang`),
    get(`/memberships/${idOwner}/get-by-owner/${cabang}/cabang`),
  ]);

  const kasbon = await kasbonRes.json().catch(() => ({}));
  if (!kasbonRes.ok) return NextResponse.json(kasbon, { status: kasbonRes.status });
  const trx = trxRes.ok ? await trxRes.json() : { data: [] };
  const members = memberRes.ok ? await memberRes.json() : { data: [] };

  const listOf = (d: any) => (Array.isArray(d) ? d : d?.items ?? []);
  const trxById = new Map(listOf(trx.data).map((t: any) => [t._id, t]));
  const memberById = new Map(listOf(members.data).map((m: any) => [m._id, m]));

  const data = listOf(kasbon.data).map((k: any) => {
    const t: any = trxById.get(k.transaksiId);
    const m: any = memberById.get(k.membershipsId);
    const total = Number(t?.jumlahTransaksi ?? 0);
    const dibayar = Number(t?.jumlahPembayaran ?? 0);
    return {
      ...k,
      noInvoice: t?.noInvoice ?? "",
      total,
      dibayar,
      sisa: Math.max(0, total - dibayar),
      memberName: m?.name ?? t?.name ?? "-",
      memberPhone: m?.phone ?? "",
    };
  });

  return NextResponse.json({ data }, { status: 200 });
}
