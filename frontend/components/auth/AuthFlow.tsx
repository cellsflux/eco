"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthCard } from "./AuthCard";
import { OtpScreen } from "./OtpScreen";
import { ForgotPasswordScreen } from "./ForgotPasswordScreen";
import { SignupStepper } from "./SignupStepper";
import { CreateEtablissementScreen } from "./CreateEtablissementScreen";
import { useAuth, type Etablissement } from "@/context/AuthContext";

type OAuthParams = {
  clientId: string | null;
  redirectUri: string | null;
  codeChallenge: string | null;
  codeChallengeMethod: string | null;
  state: string | null;
};

type OAuthPrefill = { email?: string; name?: string; avatarUrl?: string };

type Step =
  | { name: "auth" }
  | {
      name: "otp";
      email: string;
      purpose: "signup" | "login";
      pendingPhoto?: File;
    }
  | { name: "forgot" }
  | { name: "stepper"; oauthDraftToken?: string; prefill?: OAuthPrefill }
  | { name: "create-etab" }
  | { name: "dashboard" };

const SUBSCRIPTION_LABELS: Record<string, string> = {
  trial: "Essai gratuit",
  active: "Abonnement actif",
  expired: "Essai/abonnement expiré",
  none: "Aucun abonnement",
};

// À adapter vers ta vraie page de téléchargement.
const DESKTOP_APP_DOWNLOAD_URL = "https://cellsflux.app/download";

/**
 * Tente d'ouvrir l'app desktop via son protocole personnalisé. Comme un
 * navigateur ne peut pas savoir de façon fiable si une app gérant ce
 * protocole est installée, on utilise l'astuce classique: si la page perd
 * le focus/devient masquée juste après la tentative, c'est que l'OS a bien
 * transféré la main à une autre application -> succès probable. Sinon,
 * après un court délai, on considère que l'app n'est pas installée.
 */
function tryOpenDesktopApp(url: string, onLikelyNotInstalled: () => void) {
  let handedOff = false;

  const onVisibilityChange = () => {
    if (document.hidden) handedOff = true;
  };
  const onBlur = () => {
    handedOff = true;
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("blur", onBlur);

  window.location.href = url;

  setTimeout(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("blur", onBlur);
    if (!handedOff) onLikelyNotInstalled();
  }, 1500);
}

function AuthFlowInner() {
  const searchParams = useSearchParams();
  const {
    setSession,
    addEtablissement,
    updateEtablissement,
    logout,
    user,
    etablissements,
    accessToken,
  } = useAuth();

  const [mode, setMode] = useState<"signup" | "signin">("signin");
  const [step, setStep] = useState<Step>({ name: "auth" });
  const [oauthParams, setOauthParams] = useState<OAuthParams | null>(null);
  const [oauthError, setOauthError] = useState("");
  const [connectingEtabId, setConnectingEtabId] = useState<string | null>(null);
  const [notInstalledPrompt, setNotInstalledPrompt] = useState(false);
  const [uploadingLogoId, setUploadingLogoId] = useState<string | null>(null);

  const isElectronHandoff = Boolean(oauthParams?.redirectUri);

  useEffect(() => {
    setOauthParams({
      clientId: searchParams.get("client_id"),
      redirectUri: searchParams.get("redirect_uri"),
      codeChallenge: searchParams.get("code_challenge"),
      codeChallengeMethod: searchParams.get("code_challenge_method"),
      state: searchParams.get("state"),
    });
  }, [searchParams]);

  // Le tableau de bord web s'affiche TOUJOURS une fois authentifié — qu'on
  // vienne d'un lien Electron (redirect_uri présent) ou d'une simple visite
  // du site. Aucune redirection automatique et silencieuse vers l'app: la
  // connexion à Electron se fait uniquement quand l'utilisateur clique sur
  // un établissement précis (voir plus bas), ce qui double comme mécanisme
  // de sélection quand il en a plusieurs.
  useEffect(() => {
    if (!oauthParams) return; // params pas encore lus
    if (!user || !accessToken) return;
    if (step.name !== "auth") return;

    setStep(
      etablissements.length > 0
        ? { name: "dashboard" }
        : { name: "create-etab" },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, accessToken, etablissements, oauthParams]);

  function handleAuthenticated(
    token: string,
    sessionUser: unknown,
    sessionEtabs?: unknown,
  ) {
    const etabs = (sessionEtabs ?? []) as Etablissement[];
    setSession(token, sessionUser as never, etabs);
    setStep(etabs.length > 0 ? { name: "dashboard" } : { name: "create-etab" });
  }

  // Génère le code PKCE pour l'établissement choisi et redirige vers
  // Electron. N'est appelé QUE depuis le tableau de bord, sur un clic
  // explicite — jamais automatiquement. C'est cette étape qui exige
  // qu'un établissement précis soit sélectionné: sans lui, impossible de
  // finir d'authentifier l'app Electron (voir generateCode côté backend,
  // qui rejette toute tentative sans etablissementId valide).
  async function connectEtablissementToElectron(etab: Etablissement) {
    if (
      !oauthParams?.redirectUri ||
      !oauthParams.clientId ||
      !oauthParams.codeChallenge
    ) {
      return;
    }
    if (!accessToken) return;

    setOauthError("");
    setConnectingEtabId(etab.id);

    try {
      const res = await fetch("/api/oauth/code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          clientId: oauthParams.clientId,
          redirectUri: oauthParams.redirectUri,
          codeChallenge: oauthParams.codeChallenge,
          codeChallengeMethod: oauthParams.codeChallengeMethod || "S256",
          state: oauthParams.state || undefined,
          etablissementId: etab.id,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.code) {
        setOauthError(
          data.error || "Impossible de générer le code d'autorisation.",
        );
        setConnectingEtabId(null);
        return;
      }

      const callback = new URL(oauthParams.redirectUri);
      callback.searchParams.set("code", data.code);
      if (oauthParams.state) {
        callback.searchParams.set("state", oauthParams.state);
      }

      window.location.href = callback.toString();
    } catch {
      setOauthError("Lien de redirection invalide.");
      setConnectingEtabId(null);
    }
  }

  // Cas "visite web pure" (pas de redirect_uri): on tente juste d'amener
  // l'app desktop au premier plan. Electron gère ensuite son propre login
  // PKCE (déjà en place) — s'il détecte une session web active dans le même
  // navigateur, la connexion y est quasi instantanée.
  function openInDesktopApp(etab: Etablissement) {
    setNotInstalledPrompt(false);
    const url = `students://open?etablissementId=${encodeURIComponent(etab.id)}`;
    tryOpenDesktopApp(url, () => setNotInstalledPrompt(true));
  }

  async function uploadPendingPhoto(token: string, file: File) {
    try {
      const formData = new FormData();
      formData.append("photo", file);
      await fetch("/api/auth/me/photo", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      // Pas bloquant: si ça échoue, l'utilisateur pourra toujours ajouter
      // une photo plus tard depuis son profil.
    } catch {
      // silencieux, non bloquant
    }
  }

  async function handleLogoChange(etab: Etablissement, file: File) {
    if (!accessToken) return;
    setUploadingLogoId(etab.id);
    setOauthError("");

    try {
      const formData = new FormData();
      formData.append("logo", file);

      const res = await fetch(`/api/etablissements/${etab.id}/logo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setOauthError(data?.error || "Échec de l'envoi du logo.");
        return;
      }

      updateEtablissement(data.etablissement);
    } catch {
      setOauthError("Une erreur réseau est survenue lors de l'envoi du logo.");
    } finally {
      setUploadingLogoId(null);
    }
  }

  if (step.name === "otp") {
    const pendingPhoto = step.pendingPhoto;
    return (
      <OtpScreen
        email={step.email}
        purpose={step.purpose}
        onBack={() => setStep({ name: "auth" })}
        onVerified={(token, sessionUser, sessionEtabs) => {
          handleAuthenticated(token, sessionUser, sessionEtabs);
          if (pendingPhoto) uploadPendingPhoto(token, pendingPhoto);
        }}
      />
    );
  }

  if (step.name === "forgot") {
    return <ForgotPasswordScreen onBack={() => setStep({ name: "auth" })} />;
  }

  if (step.name === "stepper") {
    return (
      <SignupStepper
        oauthDraftToken={step.oauthDraftToken}
        prefill={step.prefill}
        onBack={() => setStep({ name: "auth" })}
        onNeedOtp={(email, purpose, pendingPhoto) =>
          setStep({ name: "otp", email, purpose, pendingPhoto })
        }
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  if (step.name === "create-etab" && accessToken) {
    return (
      <CreateEtablissementScreen
        accessToken={accessToken}
        onCreated={(etab) => {
          addEtablissement(etab);
          setStep({ name: "dashboard" });
        }}
        onLogout={async () => {
          await logout();
          setStep({ name: "auth" });
        }}
      />
    );
  }

  if (step.name === "dashboard") {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
          <h1 className="text-lg font-bold text-gray-900">
            Bonjour {user?.sname} {user?.lname}
          </h1>

          {isElectronHandoff && (
            <p className="mt-1.5 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
              Students App souhaite se connecter.{" "}
              {etablissements.length > 1
                ? "Choisissez l'établissement à connecter à l'application."
                : "Confirmez la connexion ci-dessous."}
            </p>
          )}

          {oauthError && (
            <p className="mt-3 text-sm text-red-600">{oauthError}</p>
          )}

          {notInstalledPrompt && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              L&apos;application students ne semble pas installée.{" "}
              <a
                href={DESKTOP_APP_DOWNLOAD_URL}
                target="_blank"
                rel="noreferrer"
                className="font-medium underline"
              >
                Télécharger l&apos;application
              </a>
            </div>
          )}

          <div className="mt-4 space-y-3">
            {etablissements.map((etab) => (
              <div
                key={etab.id}
                className="rounded-lg border border-gray-200 p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <label className="group relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                      {etab.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={etab.logo}
                          alt={etab.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-gray-400">
                          {etab.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {uploadingLogoId === etab.id ? "..." : "Modifier"}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        disabled={uploadingLogoId === etab.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLogoChange(etab, file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <div>
                      <p className="font-semibold text-gray-900">{etab.name}</p>
                      <p className="text-xs text-gray-500">
                        {etab.ville} ·{" "}
                        {Array.isArray(etab.role)
                          ? etab.role.join(", ")
                          : etab.role}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {SUBSCRIPTION_LABELS[etab.subscriptionStatus] ??
                      etab.subscriptionStatus}
                  </span>
                </div>

                {etab.trialEndsAt && (
                  <p className="mt-1 text-xs text-gray-400">
                    Essai jusqu&apos;au{" "}
                    {new Date(etab.trialEndsAt).toLocaleDateString()}
                  </p>
                )}

                <button
                  type="button"
                  disabled={connectingEtabId === etab.id}
                  onClick={() =>
                    isElectronHandoff
                      ? connectEtablissementToElectron(etab)
                      : openInDesktopApp(etab)
                  }
                  className="mt-3 flex w-full cursor-pointer items-center justify-center rounded-lg bg-gray-900 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
                >
                  {connectingEtabId === etab.id
                    ? "Connexion..."
                    : isElectronHandoff
                      ? `Connecter à students`
                      : "Ouvrir dans students"}
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setStep({ name: "create-etab" })}
            className="mt-4 flex w-full cursor-pointer items-center justify-center rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            + Créer un autre établissement
          </button>

          <button
            type="button"
            onClick={async () => {
              await logout();
              setStep({ name: "auth" });
            }}
            className="mt-2 flex w-full cursor-pointer items-center justify-center rounded-lg py-2 text-sm text-gray-500 hover:text-gray-800"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {oauthError && (
        <p className="fixed top-4 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow-lg">
          {oauthError}
        </p>
      )}
      <AuthCard
        mode={mode}
        onModeChange={setMode}
        oauthParams={oauthParams}
        onNeedOtp={(email, purpose) => setStep({ name: "otp", email, purpose })}
        onForgotPassword={() => setStep({ name: "forgot" })}
        onAuthenticated={handleAuthenticated}
        onOAuthError={setOauthError}
        onStartSignup={(prefillEmail) =>
          setStep({
            name: "stepper",
            prefill: prefillEmail ? { email: prefillEmail } : undefined,
          })
        }
        onNeedProfile={(draftToken, prefill) =>
          setStep({ name: "stepper", oauthDraftToken: draftToken, prefill })
        }
      />
    </>
  );
}

export default function AuthFlow() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Chargement...
        </div>
      }
    >
      <AuthFlowInner />
    </Suspense>
  );
}
