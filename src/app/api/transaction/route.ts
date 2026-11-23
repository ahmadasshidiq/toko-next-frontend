import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { paginationQuery, listOf, withList } from "@/utils/pagination";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);

  const idOwner = searchParams.get("id");

  if (!idOwner)
    return NextResponse.json({ error: "Parameter not found" }, { status: 400 });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const response = await fetch(
    `${baseUrl}/transaksi/${idOwner}/get-by-owner/all/cabang${paginationQuery(searchParams)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  const transactionData = await response.json();

  const transactionWithBranch = await Promise.all(
    listOf(transactionData.data).map(async (v: any) => {
      const branchRes = await fetch(`${baseUrl}/cabang/${v.cabangId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const branch = await branchRes.json();
      return {
        ...v,
        branch: branch.data,
      };
    })
  );

  return NextResponse.json(
    { data: withList(transactionData.data, transactionWithBranch) },
    { status: response.status }
  );
}
