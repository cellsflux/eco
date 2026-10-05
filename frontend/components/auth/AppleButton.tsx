"use client";

import React, { useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization: { id_token: string };
          user?: { name?: { firstName?: string; lastName?: string } };
        }>;
      };
    };
  }
}

function AppleIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.417 2.164-1.09 2.936-.786.892-2.06 1.58-3.13 1.494-.13-1.1.44-2.256 1.09-2.99.79-.9 2.16-1.56 3.13-1.44zM20.5 17.36c-.55 1.27-.81 1.84-1.52 2.96-.99 1.56-2.39 3.5-4.13 3.51-1.54.01-1.94-.99-4.03-.98-2.09.01-2.53.99-4.07.98-1.74-.01-3.06-1.77-4.05-3.32C.13 17.46-.66 12.9 1.28 9.7c.98-1.62 2.72-2.65 4.62-2.68 1.62-.03 3.15 1.09 4.14 1.09.98 0 2.84-1.35 4.79-1.15.82.03 3.11.33 4.58 2.5-.12.08-2.73 1.6-2.7 4.77.03 3.78 3.32 5.04 3.36 5.06-.03.09-.53 1.79-1.57 3.13z" />
    </svg>
  );
}

export function AppleButton({
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

  function initApple() {
    if (!window.AppleID) return;

    window.AppleID.auth.init({
      clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || "",
      scope: "name email",
      redirectURI:
        process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI ||
        (typeof window !== "undefined" ? window.location.href : ""),
      usePopup: true,
    });

    setReady(true);
  }

  async function handleClick() {
    if (!window.AppleID) return;
    setLoading(true);

    try {
      const result = await window.AppleID.auth.signIn();
      const fullName = result.user?.name
        ? [result.user.name.firstName, result.user.name.lastName]
            .filter(Boolean)
            .join(" ")
        : undefined;

      const res = await fetch("/api/auth/apple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identityToken: result.authorization.id_token,
          fullName,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        onError(data.error || "Connexion Apple échouée.");
        return;
      }

      if (data.requiresProfile) {
        onNeedProfile(data.draftToken, data.prefill);
        return;
      }

      onSuccess(data.accessToken, data.user, data.etablissements);
    } catch {
      onError("Connexion Apple échouée.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Script
        src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
        strategy="afterInteractive"
        onLoad={initApple}
      />
      <button
        type="button"
        disabled={!ready || loading}
        onClick={handleClick}
        className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:opacity-60"
      >
        <AppleIcon />
        <span>{loading ? "Connexion..." : "Continue with Apple"}</span>
      </button>
    </>
  );
}
