import { NextResponse } from "next/server";

export function forwardBackendResponse(result: {
  status: number;
  data: unknown;
  setCookie: string | null;
}) {
  const res = NextResponse.json(result.data, { status: result.status });

  if (result.setCookie) {
    // On relaie tel quel le cookie httpOnly émis par le backend (cf_refresh)
    // pour qu'il soit posé sur le domaine du frontend.
    res.headers.set("set-cookie", result.setCookie);
  }

  return res;
}
