// ⚠️ Fichier SERVEUR uniquement — jamais importé depuis un composant "use client".
// Toutes les routes /app/api/auth/* passent par ici pour parler au backend
// Node/Express. Ainsi l'URL du backend et tout secret éventuel restent
// côté serveur, jamais exposés au bundle client.

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

type BackendFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  cookie?: string | null; // cookie brut transmis depuis la requête entrante
  authorization?: string | null;
};

export async function backendFetch(
  path: string,
  options: BackendFetchOptions = {},
) {
  // IMPORTANT: on résout la méthode UNE SEULE FOIS, puis on s'en sert à la
  // fois pour l'appel fetch et pour décider d'attacher le body. Le bug
  // précédent comparait le body au `options.method` brut (souvent undefined
  // puisque la plupart des routes ne le précisent pas), donc le body partait
  // toujours `undefined` vers le backend -> "email Required, password Required".
  const method = options.method || "POST";

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(options.cookie ? { cookie: options.cookie } : {}),
      ...(options.authorization
        ? { authorization: options.authorization }
        : {}),
    },
    body:
      method !== "GET" && options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
    cache: "no-store",
  });

  const setCookie = res.headers.get("set-cookie");
  let data: unknown = null;

  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { status: res.status, data, setCookie };
}
