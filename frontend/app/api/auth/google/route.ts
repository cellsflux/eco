import { NextRequest } from "next/server";
import { backendFetch } from "@/lib/backend";
import { forwardBackendResponse } from "@/lib/proxyResponse";

// Reçoit { idToken } généré côté client par Google Identity Services (web)
// ou @react-native-google-signin/google-signin (mobile), et le fait vérifier
// par le backend Node avant d'émettre une session.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await backendFetch("/api/auth/google", { body });
  return forwardBackendResponse(result);
}
