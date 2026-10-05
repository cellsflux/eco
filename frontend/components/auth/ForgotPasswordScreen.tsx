"use client";

import React, { useState } from "react";
import { ChevronLeft, KeyRound } from "lucide-react";

export function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Une erreur est survenue.");
        return;
      }

      setSent(true);
    } catch {
      setError("Une erreur réseau est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-100 p-4 sm:p-6">
      <div className="xs:max-w-sm w-full max-w-[92vw] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl sm:max-w-sm">
        <div className="px-5 pt-6 pb-8 sm:px-8 sm:pt-8">
          <button
            type="button"
            onClick={onBack}
            className="mb-5 flex cursor-pointer items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour
          </button>

          <div className="mb-5 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 sm:h-14 sm:w-14">
              <KeyRound className="h-5 w-5 text-white sm:h-6 sm:w-6" />
            </div>
          </div>

          <h1 className="text-center text-lg font-bold text-gray-900 sm:text-xl">
            Mot de passe oublié
          </h1>
          <p className="mt-1.5 mb-8 px-1 text-center text-sm text-gray-500">
            {sent
              ? "Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé."
              : "Entrez votre email, nous vous enverrons un lien pour le réinitialiser."}
          </p>

          {!sent ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="forgot-email"
                  className="mb-1.5 block text-sm font-medium text-gray-900"
                >
                  Email address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:outline-none"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 active:bg-gray-950 disabled:opacity-60"
              >
                {loading ? "Envoi en cours..." : "Envoyer le lien"}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={onBack}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
            >
              Retour à la connexion
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
