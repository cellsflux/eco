import { NextRequest } from "next/server";
import { backendFetch } from "@/lib/backend";
import { forwardBackendResponse } from "@/lib/proxyResponse";

// Optionnel: si l'app Electron préfère taper sur le domaine du frontend
// plutôt que de connaître l'URL du backend directement. Sinon Electron peut
// appeler POST {BACKEND_URL}/api/oauth/token directement lui-même.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await backendFetch("/api/oauth/token", { body });
  return forwardBackendResponse(result);
}
