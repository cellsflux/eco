"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Sparkles } from "lucide-react";

type Gender = "homme" | "femme" | "autre" | "prefere_ne_pas_dire";

type SignupDraft = {
  email: string;
  fname: string;
  lname: string;
  username: string;
  dataOfBrith: string; // yyyy-mm-dd
  gander: Gender | "";
  password: string;
  confirmPassword: string;
  photoFile: File | null;
  photoPreview: string;
};

const GENDERS: { value: Gender; label: string }[] = [
  { value: "femme", label: "Femme" },
  { value: "homme", label: "Homme" },
  { value: "autre", label: "Autre" },
  { value: "prefere_ne_pas_dire", label: "Préfère ne pas dire" },
];

function inputClass() {
  return "w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:outline-none";
}

export function SignupStepper({
  oauthDraftToken,
  prefill,
  onBack,
  onNeedOtp,
  onAuthenticated,
}: {
  oauthDraftToken?: string | null;
  prefill?: { email?: string; name?: string; avatarUrl?: string } | null;
  onBack: () => void;
  onNeedOtp: (email: string, purpose: "signup" | "login", pendingPhoto?: File) => void;
  onAuthenticated: (accessToken: string, user: unknown, etablissements?: unknown) => void;
}) {
  const isOAuth = Boolean(oauthDraftToken);

  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [draft, setDraft] = useState<SignupDraft>(() => {
    const [guessedFname, ...rest] = (prefill?.name || "").split(" ");
    return {
      email: prefill?.email || "",
      fname: guessedFname || "",
      lname: rest.join(" ") || "",
      username: "",
      dataOfBrith: "",
      gander: "",
      password: "",
      confirmPassword: "",
      photoFile: null,
      photoPreview: "",
    };
  });

  const steps = useMemo(
    () =>
      isOAuth
        ? (["identity", "personal", "photo", "review"] as const)
        : (["email", "identity", "personal", "password", "photo", "review"] as const),
    [isOAuth],
  );

  const step = steps[stepIndex];

  function update<K extends keyof SignupDraft>(key: K, value: SignupDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function goNext() {
    setError("");
    const err = validateStep(step, draft);
    if (err) {
      setError(err);
      return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function goBack() {
    setError("");
    if (stepIndex === 0) {
      onBack();
      return;
    }
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: draft.email,
          fname: draft.fname,
          lname: draft.lname,
          username: draft.username,
          dataOfBrith: draft.dataOfBrith,
          gander: draft.gander,
          ...(isOAuth ? { oauthDraftToken } : { password: draft.password }),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.code === "USERNAME_TAKEN") {
          setStepIndex(steps.indexOf("identity" as (typeof steps)[number]));
        }
        setError(data.error || "Une erreur est survenue.");
        return;
      }

      if (data.accessToken) {
        onAuthenticated(data.accessToken, data.user, data.etablissements);
        return;
      }

        onNeedOtp(draft.email, "signup", draft.photoFile || undefined);
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
          <div className="mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={goBack}
              className="flex cursor-pointer items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
            >
              <ChevronLeft className="h-4 w-4" />
              Retour
            </button>
            <span className="text-xs font-medium text-gray-400">
              Étape {stepIndex + 1}/{steps.length}
            </span>
          </div>

          <StepDots total={steps.length} current={stepIndex} />

          <div className="mb-5 mt-5 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 sm:h-14 sm:w-14">
              <Sparkles className="h-5 w-5 text-white sm:h-6 sm:w-6" fill="white" />
            </div>
          </div>

          {step === "email" && <EmailStep draft={draft} update={update} />}
          {step === "identity" && (
            <IdentityStep draft={draft} update={update} isOAuth={isOAuth} />
          )}
          {step === "personal" && <PersonalStep draft={draft} update={update} />}
          {step === "password" && <PasswordStep draft={draft} update={update} />}
          {step === "photo" && <PhotoStep draft={draft} update={update} />}
          {step === "review" && <ReviewStep draft={draft} isOAuth={isOAuth} />}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <button
            type="button"
            disabled={loading}
            onClick={step === "review" ? handleSubmit : goNext}
            className="mt-6 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 active:bg-gray-950 disabled:opacity-60"
          >
            {loading
              ? "Création en cours..."
              : step === "review"
                ? "Créer mon compte"
                : "Continuer"}
            {!loading && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function validateStep(step: string, draft: SignupDraft): string {
  if (step === "email") {
    if (!/^\S+@\S+\.\S+$/.test(draft.email)) return "Email invalide.";
  }
  if (step === "identity") {
    if (!draft.fname.trim() || !draft.lname.trim()) return "Prénom et nom requis.";
    if (!/^[a-zA-Z0-9_.]{3,24}$/.test(draft.username)) {
      return "Nom d'utilisateur: 3-24 caractères, lettres/chiffres/_/.";
    }
  }
  if (step === "personal") {
    if (!draft.dataOfBrith) return "Date de naissance requise.";
    const age =
      (Date.now() - new Date(draft.dataOfBrith).getTime()) / (365.25 * 24 * 3600 * 1000);
    if (age < 13) return "Vous devez avoir au moins 13 ans.";
    if (!draft.gander) return "Veuillez sélectionner une option.";
  }
  if (step === "password") {
    if (draft.password.length < 8) return "8 caractères minimum.";
    if (draft.password !== draft.confirmPassword) return "Les mots de passe ne correspondent pas.";
  }
  return "";
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === current ? "w-6 bg-gray-900" : i < current ? "w-1.5 bg-gray-900" : "w-1.5 bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

function EmailStep({
  draft,
  update,
}: {
  draft: SignupDraft;
  update: <K extends keyof SignupDraft>(key: K, value: SignupDraft[K]) => void;
}) {
  return (
    <>
      <h1 className="text-center text-lg font-bold text-gray-900 sm:text-xl">
        Quel est votre email ?
      </h1>
      <p className="mt-1.5 mb-6 px-1 text-center text-sm text-gray-500">
        On vous enverra un code pour le vérifier.
      </p>
      <input
        type="email"
        autoFocus
        value={draft.email}
        onChange={(e) => update("email", e.target.value)}
        placeholder="Enter your email address"
        className={inputClass()}
      />
    </>
  );
}

function IdentityStep({
  draft,
  update,
  isOAuth,
}: {
  draft: SignupDraft;
  update: <K extends keyof SignupDraft>(key: K, value: SignupDraft[K]) => void;
  isOAuth: boolean;
}) {
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<"idle" | "available" | "taken">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!/^[a-zA-Z0-9_.]{3,24}$/.test(draft.username)) {
      setAvailability("idle");
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setChecking(true);
      try {
        const res = await fetch("/api/auth/check-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: draft.username }),
        });
        const data = await res.json();
        setAvailability(data.available ? "available" : "taken");
      } catch {
        setAvailability("idle");
      } finally {
        setChecking(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draft.username]);

  return (
    <>
      <h1 className="text-center text-lg font-bold text-gray-900 sm:text-xl">
        Faisons connaissance
      </h1>
      <p className="mt-1.5 mb-6 px-1 text-center text-sm text-gray-500">
        {isOAuth
          ? "Complétez votre profil pour terminer la création du compte."
          : "Comment souhaitez-vous être appelé ?"}
      </p>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-900">Prénom</label>
            <input
              autoFocus
              value={draft.fname}
              onChange={(e) => update("fname", e.target.value)}
              placeholder="Prénom"
              className={inputClass()}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-900">Nom</label>
            <input
              value={draft.lname}
              onChange={(e) => update("lname", e.target.value)}
              placeholder="Nom"
              className={inputClass()}
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-900">
            Nom d&apos;utilisateur
          </label>
          <input
            value={draft.username}
            onChange={(e) => update("username", e.target.value)}
            placeholder="ex: jison_dev"
            className={inputClass()}
          />
          {checking && <p className="mt-1 text-xs text-gray-400">Vérification...</p>}
          {!checking && availability === "available" && (
            <p className="mt-1 text-xs text-green-600">Disponible</p>
          )}
          {!checking && availability === "taken" && (
            <p className="mt-1 text-xs text-red-600">Déjà pris</p>
          )}
        </div>
      </div>
    </>
  );
}

function PersonalStep({
  draft,
  update,
}: {
  draft: SignupDraft;
  update: <K extends keyof SignupDraft>(key: K, value: SignupDraft[K]) => void;
}) {
  return (
    <>
      <h1 className="text-center text-lg font-bold text-gray-900 sm:text-xl">
        Quelques infos en plus
      </h1>
      <p className="mt-1.5 mb-6 px-1 text-center text-sm text-gray-500">
        Ça reste privé, ça nous aide juste à personnaliser votre expérience.
      </p>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-900">
            Date de naissance
          </label>
          <input
            type="date"
            value={draft.dataOfBrith}
            onChange={(e) => update("dataOfBrith", e.target.value)}
            className={inputClass()}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-900">Genre</label>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => update("gander", g.value)}
                className={`cursor-pointer rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  draft.gander === g.value
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function PasswordStep({
  draft,
  update,
}: {
  draft: SignupDraft;
  update: <K extends keyof SignupDraft>(key: K, value: SignupDraft[K]) => void;
}) {
  return (
    <>
      <h1 className="text-center text-lg font-bold text-gray-900 sm:text-xl">
        Choisissez un mot de passe
      </h1>
      <p className="mt-1.5 mb-6 px-1 text-center text-sm text-gray-500">
        Au moins 8 caractères.
      </p>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-900">Mot de passe</label>
          <input
            type="password"
            autoFocus
            value={draft.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder="Enter your password"
            className={inputClass()}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-900">Confirmer</label>
          <input
            type="password"
            value={draft.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
            placeholder="Retapez le mot de passe"
            className={inputClass()}
          />
        </div>
      </div>
    </>
  );
}

function PhotoStep({
  draft,
  update,
}: {
  draft: SignupDraft;
  update: <K extends keyof SignupDraft>(key: K, value: SignupDraft[K]) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleSelect(file: File | null) {
    if (!file) {
      update("photoFile", null);
      update("photoPreview", "");
      return;
    }
    update("photoFile", file);
    update("photoPreview", URL.createObjectURL(file));
  }

  return (
    <>
      <div className="mb-5 flex justify-center">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50"
        >
          {draft.photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.photoPreview} alt="Photo" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-medium text-gray-400">Photo</span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            Choisir
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => handleSelect(e.target.files?.[0] || null)}
        />
      </div>
      <h1 className="text-center text-lg font-bold text-gray-900 sm:text-xl">
        Photo de profil
      </h1>
      <p className="mt-1.5 mb-2 px-1 text-center text-sm text-gray-500">
        Optionnel — vous pourrez l&apos;ajouter ou la changer plus tard.
      </p>
    </>
  );
}

function ReviewStep({ draft, isOAuth }: { draft: SignupDraft; isOAuth: boolean }) {
  const genderLabel = GENDERS.find((g) => g.value === draft.gander)?.label || "-";

  return (
    <>
      <h1 className="text-center text-lg font-bold text-gray-900 sm:text-xl">
        Vérifiez vos informations
      </h1>
      <p className="mt-1.5 mb-6 px-1 text-center text-sm text-gray-500">
        Tout est correct ? On crée votre compte.
      </p>
      <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
        <ReviewRow label="Email" value={draft.email} icon={<Check className="h-3.5 w-3.5" />} />
        <ReviewRow label="Nom complet" value={`${draft.fname} ${draft.lname}`} />
        <ReviewRow label="Nom d'utilisateur" value={`@${draft.username}`} />
        <ReviewRow label="Date de naissance" value={draft.dataOfBrith} />
        <ReviewRow label="Genre" value={genderLabel} />
        {!isOAuth && <ReviewRow label="Mot de passe" value="••••••••" />}
      </div>
    </>
  );
}

function ReviewRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-1.5 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="flex items-center gap-1.5 font-medium text-gray-900">
        {value}
        {icon}
      </span>
    </div>
  );
}
