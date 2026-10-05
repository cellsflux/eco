import { NextRequest } from "next/server";
import { backendFetch } from "@/lib/backend";
import { forwardBackendResponse } from "@/lib/proxyResponse";

export async function POST(req: NextRequest) {
  const result = await backendFetch("/api/auth/logout", {
    body: {},
    cookie: req.headers.get("cookie"),
  });
  return forwardBackendResponse(result);
}
