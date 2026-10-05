import { NextRequest, NextResponse } from "next/server";

// Multipart (pas JSON via lib/backend.ts): le logo peut être fourni dans la
// même requête que les autres champs, directement à la création.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const res = await fetch(`${BACKEND_URL}/api/etablissements`, {
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
