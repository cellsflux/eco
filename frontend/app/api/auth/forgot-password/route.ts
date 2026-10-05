import { NextRequest } from "next/server";
import { backendFetch } from "@/lib/backend";
import { forwardBackendResponse } from "@/lib/proxyResponse";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await backendFetch("/api/auth/forgot-password", { body });
  return forwardBackendResponse(result);
}
