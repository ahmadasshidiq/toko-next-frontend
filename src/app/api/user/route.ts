import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { paginationQuery, listOf, withList } from "@/utils/pagination";
import { capitalizeWords } from "@/utils/helper";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);

  const idOwner = searchParams.get("id");
  const emailOwner = searchParams.get("email");

  if (!emailOwner || !idOwner)
    return NextResponse.json({ error: "Parameter not found" }, { status: 400 });

  const emailBase64 = btoa(emailOwner);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const resUser = await fetch(`${baseUrl}/users/${emailBase64}/email${paginationQuery(searchParams)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const userData = await resUser.json();

  if (!resUser.ok) {
    return NextResponse.json(resUser, { status: resUser.status });
  }

  const userWithBranch = await Promise.all(
    listOf(userData.data).map(async (v: any) => {
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

  return NextResponse.json({ data: withList(userData.data, userWithBranch) }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      idOwner,
      name,
      cabangId,
      email,
      role,
      store,
      emailOwner,
      password,
    } = body;

    if (!idOwner || !name || !role || !store || !emailOwner || !cabangId || !password)
      return NextResponse.json(
        { error: "Incomplete user data" },
        { status: 400 }
      );

    const encodedPassword = Buffer.from(password).toString("base64");

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const response = await fetch(`${baseUrl}/users/${idOwner}/karyawan`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        email,
        password: encodedPassword,
        cabangId,
        role,
        store,
        parent: emailOwner,
      }),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
