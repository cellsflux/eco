"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, CheckCircle2 } from "lucide-react";

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!email || !token) {
      setError("Lien de réinitialisation invalide.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Lien invalide ou expiré.");
        return;
      }

      setDone(true);
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
          <div className="mb-5 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 sm:h-14 sm:w-14">
              {done ? (
                <CheckCircle2 className="h-5 w-5 text-white sm:h-6 sm:w-6" />
              ) : (
                <Lock className="h-5 w-5 text-white sm:h-6 sm:w-6" />
              )}
            </div>
          </div>

          <h1 className="text-center text-lg font-bold text-gray-900 sm:text-xl">
            {done ? "Mot de passe mis à jour" : "Nouveau mot de passe"}
          </h1>
          <p className="mt-1.5 mb-8 px-1 text-center text-sm text-gray-500">
            {done
              ? "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe."
              : `Choisissez un nouveau mot de passe pour ${email || "votre compte"}.`}
          </p>

          {!done ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="new-password"
                  className="mb-1.5 block text-sm font-medium text-gray-900"
                >
                  Nouveau mot de passe
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Au moins 8 caractères"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1.5 block text-sm font-medium text-gray-900"
                >
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Retapez le mot de passe"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:outline-none"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 active:bg-gray-950 disabled:opacity-60"
              >
                {loading ? "Mise à jour..." : "Réinitialiser le mot de passe"}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
            >
              Aller à la connexion
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordScreen() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Chargement...
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
