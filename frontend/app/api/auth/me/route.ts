import { NextRequest } from "next/server";
import { backendFetch } from "@/lib/backend";
import { forwardBackendResponse } from "@/lib/proxyResponse";

export async function GET(req: NextRequest) {
  const result = await backendFetch("/api/auth/me", {
    method: "GET",
    authorization: req.headers.get("authorization"),
  });
  return forwardBackendResponse(result);
}
