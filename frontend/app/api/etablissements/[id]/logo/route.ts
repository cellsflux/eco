import { NextRequest, NextResponse } from "next/server";

// Route à part (pas via lib/backend.ts) car c'est le seul endpoint qui parle
// multipart/form-data plutôt que JSON — backendFetch() ne gère que le JSON.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const formData = await req.formData();

  const res = await fetch(`${BACKEND_URL}/api/etablissements/${id}/logo`, {
    method: "POST",
    headers: {
      authorization: req.headers.get("authorization") || "",
    },
    body: formData,
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}
