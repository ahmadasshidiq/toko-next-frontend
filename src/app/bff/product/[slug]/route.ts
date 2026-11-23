import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(_: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = params.slug;

  const baseUrl = process.env.API_BASE_URL;
  const response = await fetch(`${baseUrl}/produk/${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function DELETE(_: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = params.slug;

    const baseUrl = process.env.API_BASE_URL;
    const response = await fetch(`${baseUrl}/produk/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}