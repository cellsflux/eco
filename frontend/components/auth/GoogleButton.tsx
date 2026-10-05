"use client";

import React, { useCallback, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

function GoogleIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.73z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1C3.25 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29v-3.1H1.27A11.96 11.96 0 0 0 0 12c0 1.93.46 3.76 1.27 5.39l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.61l4 3.1c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

export function GoogleButton({
  onSuccess,
  onError,
  onNeedProfile,
}: {
  onSuccess: (accessToken: string, user: unknown, etablissements?: unknown) => void;
  onError: (message: string) => void;
  onNeedProfile: (
    draftToken: string,
    prefill: { email?: string; name?: string; avatarUrl?: string },
  ) => void;
}) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const initGoogle = useCallback(() => {
    if (!window.google) return;

    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      callback: async (response) => {
        setLoading(true);
        try {
          const res = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: response.credential }),
          });
          const data = await res.json();

          if (!res.ok) {
            onError(data.error || "Connexion Google échouée.");
            return;
          }

          // Compte pas encore créé côté CellsFlux -> direction le stepper
          // d'inscription, pré-rempli avec ce que Google a déjà vérifié.
          if (data.requiresProfile) {
            onNeedProfile(data.draftToken, data.prefill);
            return;
          }

          onSuccess(data.accessToken, data.user, data.etablissements);
        } catch {
          onError("Connexion Google échouée.");
        } finally {
          setLoading(false);
        }
      },
    });

    setReady(true);
  }, [onError, onNeedProfile, onSuccess]);

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initGoogle}
      />
      <button
        type="button"
        disabled={!ready || loading}
        onClick={() => window.google?.accounts.id.prompt()}
        className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:opacity-60"
      >
        <GoogleIcon />
        <span>{loading ? "Connexion..." : "Continue with Google"}</span>
      </button>
    </>
  );
}
