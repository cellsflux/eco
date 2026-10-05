"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, ChevronRight } from "lucide-react";
import { GoogleButton } from "./GoogleButton";
import { AppleButton } from "./AppleButton";

type OAuthParams = {
  clientId: string | null;
  redirectUri: string | null;
  codeChallenge: string | null;
  codeChallengeMethod: string | null;
  state: string | null;
};

type OAuthPrefill = { email?: string; name?: string; avatarUrl?: string };

export function AuthCard({
  mode,
  onModeChange,
  oauthParams,
  onNeedOtp,
  onForgotPassword,
  onAuthenticated,
  onOAuthError,
  onStartSignup,
  onNeedProfile,
}: {
  mode: "signup" | "signin";
  onModeChange: (mode: "signup" | "signin") => void;
  oauthParams: OAuthParams | null;
  onNeedOtp: (email: string, purpose: "signup" | "login") => void;
  onForgotPassword: () => void;
  onAuthenticated: (accessToken: string, user: unknown, etablissements?: unknown) => void;
  onOAuthError: (message: string) => void;
  // Bascule vers le stepper d'inscription complet, avec email pré-rempli si
  // l'utilisateur vient de le taper en tentant de se connecter.
  onStartSignup: (prefillEmail?: string) => void;
  // Bascule vers le stepper d'inscription pour finir un flow Google/Apple.
  onNeedProfile: (draftToken: string, prefill: OAuthPrefill) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isSignUp = mode === "signup";

  useEffect(() => {
    setError("");
  }, [mode]);

  async function callLogin(): Promise<void> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      // Pas de compte -> direction le stepper d'inscription complet, avec
      // l'email déjà tapé, au lieu d'un message d'erreur.
      if (data.code === "ACCOUNT_NOT_FOUND") {
        onStartSignup(email);
        return;
      }

      if (data.code === "EMAIL_NOT_VERIFIED") {
        onNeedOtp(email, "signup");
        return;
      }

      setError(data.error || "Mot de passe incorrect.");
      return;
    }

    onNeedOtp(email, "login");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await callLogin();
    } catch {
      setError("Une erreur réseau est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-100 p-4 sm:p-6">
      <div className="xs:max-w-sm w-full max-w-[92vw] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl sm:max-w-sm">
        <div className="px-5 pt-6 pb-6 sm:px-8 sm:pt-8">
          <div className="mb-5 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 sm:h-14 sm:w-14">
              <Sparkles className="h-5 w-5 text-white sm:h-6 sm:w-6" fill="white" />
            </div>
          </div>

          <div className="mb-6 flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => onModeChange("signin")}
              className={`flex-1 cursor-pointer rounded-md py-1.5 text-sm font-medium transition-colors ${
                !isSignUp
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => onModeChange("signup")}
              className={`flex-1 cursor-pointer rounded-md py-1.5 text-sm font-medium transition-colors ${
                isSignUp
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Sign up
            </button>
          </div>

          <h1 className="text-center text-lg font-bold text-gray-900 sm:text-xl">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1.5 mb-6 px-1 text-center text-sm text-gray-500">
            {isSignUp
              ? "Quelques étapes rapides pour créer votre compte."
              : "Sign in to continue to CellsFlux."}
          </p>

          {oauthParams?.clientId && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-[11px] text-blue-700">
              <p>
                <strong>client_id:</strong> {oauthParams.clientId}
              </p>
              <p className="truncate">
                <strong>redirect_uri:</strong> {oauthParams.redirectUri}
              </p>
            </div>
          )}

          <div className="space-y-2.5">
            <GoogleButton
              onSuccess={onAuthenticated}
              onError={onOAuthError}
              onNeedProfile={onNeedProfile}
            />
            <AppleButton
              onSuccess={onAuthenticated}
              onError={onOAuthError}
              onNeedProfile={onNeedProfile}
            />
          </div>

          <div className="my-6 flex items-center">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="px-3 text-xs text-gray-400">or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {isSignUp ? (
            // Le stepper gère lui-même email/prénom/nom/username/date de
            // naissance/genre/mot de passe, étape par étape. On ne redemande
            // donc rien ici, juste le point d'entrée.
            <button
              type="button"
              onClick={() => onStartSignup()}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 active:bg-gray-950"
            >
              Créer mon compte
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-900">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:outline-none"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-800 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:outline-none"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 active:bg-gray-950 disabled:opacity-60"
              >
                {loading ? "Chargement..." : "Sign in"}
                {!loading && <ChevronRight className="h-4 w-4" />}
              </button>
            </form>
          )}
        </div>

        <div className="border-t border-gray-100 bg-gray-50 py-3.5 text-center">
          <span className="text-sm text-gray-500">
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
          </span>
          <button
            type="button"
            onClick={() => onModeChange(isSignUp ? "signin" : "signup")}
            className="cursor-pointer text-sm font-medium text-gray-900 hover:underline"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 border-t border-gray-100 bg-gray-50 py-2.5">
          <span className="text-xs text-gray-400">Secured by</span>
          <span className="flex items-center gap-1 text-xs font-semibold text-gray-500">
            <Sparkles className="h-3 w-3" />
            CellsFlux
          </span>
        </div>
      </div>
    </div>
  );
}
