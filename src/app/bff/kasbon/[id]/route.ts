import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/** PUT /bff/kasbon/<id> — tandai kasbon lunas. */
export async function PUT(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get("token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const response = await fetch(`${process.env.API_BASE_URL}/kasbon/${id}/lunas`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const res = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(
      { error: res?.message || res?.error || "Gagal melunasi kasbon" },
      { status: response.status }
    );
  }
  return NextResponse.json({ data: null }, { status: 200 });
}
