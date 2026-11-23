import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { paginationQuery } from "@/utils/pagination";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);

  const idOwner = searchParams.get("id");

  if (!idOwner)
    return NextResponse.json({ error: "Parameter not found" }, { status: 400 });

  const baseUrl = process.env.API_BASE_URL;
  const response = await fetch(`${baseUrl}/produk/${idOwner}/get-by-owner${paginationQuery(searchParams)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
