import { NextRequest } from "next/server";
import { backendFetch } from "@/lib/backend";
import { forwardBackendResponse } from "@/lib/proxyResponse";

// Reçoit { identityToken, fullName? } généré côté client par
// "Sign in with Apple JS" (web) ou expo-apple-authentication (mobile).
export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await backendFetch("/api/auth/apple", { body });
  return forwardBackendResponse(result);
}
