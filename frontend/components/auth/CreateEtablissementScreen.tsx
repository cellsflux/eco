"use client";

import React, { useRef, useState } from "react";
import { Building2, ChevronRight, ChevronLeft, Sparkles, Info, Upload } from "lucide-react";
import type { Etablissement } from "@/context/AuthContext";

type EtabType = "primaire" | "secondaire" | "maternel" | "creush" | "complexe_scolaire";
type PaymentMethod = "mobile_money" | "carte" | "virement" | "cash" | "autre";

const TYPES: { value: EtabType; label: string }[] = [
  { value: "maternel", label: "Maternel" },
  { value: "primaire", label: "Primaire" },
  { value: "secondaire", label: "Secondaire" },
  { value: "complexe_scolaire", label: "Complexe scolaire" },
  { value: "creush", label: "Crèche" },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "mobile_money", label: "Mobile Money" },
  { value: "carte", label: "Carte bancaire" },
  { value: "virement", label: "Virement" },
  { value: "cash", label: "Cash / en personne" },
  { value: "autre", label: "Autre" },
];

const PAYMENT_PERIODS = [
  { value: 30, label: "1 mois" },
  { value: 90, label: "3 mois" },
  { value: 365, label: "1 an" },
];

function inputClass() {
  return "w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:outline-none";
}

// Petite bulle d'aide native (title="...") pour expliquer les champs qui ne
// sont pas évidents au premier coup d'œil, sans dépendance supplémentaire.
function InfoHint({ text }: { text: string }) {
  return (
    <span title={text} className="inline-flex cursor-help text-gray-400 hover:text-gray-600">
      <Info className="h-3.5 w-3.5" />
    </span>
  );
}

type Draft = {
  name: string;
  type: EtabType | "";
  logoFile: File | null;
  logoPreview: string;
  pays: string;
  province: string;
  ville: string;
  matriculePrefix: string;
  matriculeLength: string;
  ownerName: string;
  ownerPhone: string;
  deviseName: string;
  deviseSymbole: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  subscriptionChoice: "trial" | "paid";
  paymentAmount: string;
  paymentDevise: string;
  paymentMethod: PaymentMethod | "";
  paymentPeriodDays: number;
};

export function CreateEtablissementScreen({
  accessToken,
  onCreated,
  onLogout,
}: {
  accessToken: string;
  onCreated: (etablissement: Etablissement) => void;
  onLogout: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<Draft>({
    name: "",
    type: "",
    logoFile: null,
    logoPreview: "",
    pays: "",
    province: "",
    ville: "",
    matriculePrefix: "",
    matriculeLength: "",
    ownerName: "",
    ownerPhone: "",
    deviseName: "",
    deviseSymbole: "",
    phone: "",
    email: "",
    website: "",
    description: "",
    subscriptionChoice: "trial",
    paymentAmount: "",
    paymentDevise: "USD",
    paymentMethod: "",
    paymentPeriodDays: 30,
  });

  const steps = ["identite", "localisation", "configuration", "contact", "abonnement"] as const;
  const step = steps[stepIndex];

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleLogoSelect(file: File | null) {
    if (!file) {
      update("logoFile", null);
      update("logoPreview", "");
      return;
    }
    update("logoFile", file);
    update("logoPreview", URL.createObjectURL(file));
  }

  function validateStep(): string {
    if (step === "identite") {
      if (!draft.name.trim()) return "Le nom de l'établissement est requis.";
      if (!draft.type) return "Sélectionnez un type d'établissement.";
    }
    if (step === "localisation") {
      if (!draft.pays.trim() || !draft.province.trim() || !draft.ville.trim()) {
        return "Pays, province et ville sont requis.";
      }
    }
    if (step === "abonnement" && draft.subscriptionChoice === "paid") {
      if (!draft.paymentAmount || Number(draft.paymentAmount) <= 0) {
        return "Indiquez un montant valide.";
      }
      if (!draft.paymentMethod) return "Choisissez une méthode de paiement.";
    }
    return "";
  }

  function goNext() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function goBack() {
    setError("");
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function handleSubmit() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", draft.name);
      formData.append("type", draft.type);
      formData.append("pays", draft.pays);
      formData.append("province", draft.province);
      formData.append("ville", draft.ville);
      formData.append("phone", draft.phone);
      formData.append("email", draft.email);
      formData.append("website", draft.website);
      formData.append("description", draft.description);
      formData.append("ownerName", draft.ownerName);
      formData.append("ownerPhone", draft.ownerPhone);
      formData.append("deviseName", draft.deviseName);
      formData.append("deviseSymbole", draft.deviseSymbole);
      formData.append("matriculePrefix", draft.matriculePrefix);
      if (draft.matriculeLength) formData.append("matriculeLength", draft.matriculeLength);
      formData.append("subscriptionChoice", draft.subscriptionChoice);
      if (draft.subscriptionChoice === "paid") {
        formData.append("paymentAmount", draft.paymentAmount);
        formData.append("paymentDevise", draft.paymentDevise);
        formData.append("paymentMethod", draft.paymentMethod);
        formData.append("paymentPeriodDays", String(draft.paymentPeriodDays));
      }
      if (draft.logoFile) formData.append("logo", draft.logoFile);

      const res = await fetch("/api/etablissements", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Une erreur est survenue.");
        return;
      }

      onCreated(data.etablissement);
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
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={goBack}
                className="flex cursor-pointer items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
              >
                <ChevronLeft className="h-4 w-4" />
                Retour
              </button>
            ) : (
              <button
                type="button"
                onClick={onLogout}
                className="cursor-pointer text-sm text-gray-400 hover:text-gray-700"
              >
                Se déconnecter
              </button>
            )}
            <span className="text-xs font-medium text-gray-400">
              Étape {stepIndex + 1}/{steps.length}
            </span>
          </div>

          {step === "identite" && (
            <>
              <div className="mb-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="group relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
                >
                  {draft.logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.logoPreview} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-6 w-6 text-gray-400" />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Upload className="h-3 w-3" /> Logo
                  </span>
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => handleLogoSelect(e.target.files?.[0] || null)}
                />
              </div>

              <h1 className="text-center text-lg font-bold text-gray-900 sm:text-xl">
                Créez votre établissement
              </h1>
              <p className="mt-1.5 mb-6 flex items-center justify-center gap-1.5 px-1 text-center text-sm text-gray-500">
                <Sparkles className="h-3.5 w-3.5 text-gray-400" />
                Logo optionnel — vous pourrez le changer plus tard.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-900">
                    Nom de l&apos;établissement
                  </label>
                  <input
                    autoFocus
                    value={draft.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="ex: Complexe Scolaire Les Palmiers"
                    className={inputClass()}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-900">Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => update("type", t.value)}
                        className={`cursor-pointer rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                          draft.type === t.value
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {step === "localisation" && (
            <>
              <h1 className="text-center text-lg font-bold text-gray-900 sm:text-xl">
                Où se trouve l&apos;établissement ?
              </h1>
              <p className="mt-1.5 mb-6 px-1 text-center text-sm text-gray-500">
                Utilisé pour vos documents administratifs.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-900">Pays</label>
                  <input
                    autoFocus
                    value={draft.pays}
                    onChange={(e) => update("pays", e.target.value)}
                    placeholder="ex: République Démocratique du Congo"
                    className={inputClass()}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-900">
                      Province
                    </label>
                    <input
                      value={draft.province}
                      onChange={(e) => update("province", e.target.value)}
                      placeholder="ex: Kinshasa"
                      className={inputClass()}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-900">Ville</label>
                    <input
                      value={draft.ville}
                      onChange={(e) => update("ville", e.target.value)}
                      placeholder="ex: Kinshasa"
                      className={inputClass()}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {step === "configuration" && (
            <>
              <h1 className="text-center text-lg font-bold text-gray-900 sm:text-xl">
                Configuration
              </h1>
              <p className="mt-1.5 mb-6 px-1 text-center text-sm text-gray-500">
                Tout est optionnel et modifiable plus tard.
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-900">
                      Préfixe matricule
                      <InfoHint text="Collé devant chaque numéro de matricule élève généré par l'app. Ex: préfixe 'ETS' -> ETS-000123." />
                    </label>
                    <input
                      value={draft.matriculePrefix}
                      onChange={(e) => update("matriculePrefix", e.target.value)}
                      placeholder="ex: ETS"
                      className={inputClass()}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-900">
                      Longueur matricule
                      <InfoHint text="Nombre de chiffres que la partie numérique du matricule doit toujours avoir. Ex: longueur 6 -> 000123 au lieu de 123." />
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={draft.matriculeLength}
                      onChange={(e) => update("matriculeLength", e.target.value)}
                      placeholder="ex: 6"
                      className={inputClass()}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-900">
                    Devise principale
                    <InfoHint text="La monnaie utilisée pour les frais scolaires dans cet établissement (ex: Franc Congolais, Dollar)." />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={draft.deviseName}
                      onChange={(e) => update("deviseName", e.target.value)}
                      placeholder="ex: Franc Congolais"
                      className={inputClass()}
                    />
                    <input
                      value={draft.deviseSymbole}
                      onChange={(e) => update("deviseSymbole", e.target.value)}
                      placeholder="ex: FC"
                      className={inputClass()}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-900">
                      Nom du propriétaire
                    </label>
                    <input
                      value={draft.ownerName}
                      onChange={(e) => update("ownerName", e.target.value)}
                      placeholder="Pré-rempli avec votre nom"
                      className={inputClass()}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-900">
                      Téléphone propriétaire
                    </label>
                    <input
                      value={draft.ownerPhone}
                      onChange={(e) => update("ownerPhone", e.target.value)}
                      placeholder="+243 ..."
                      className={inputClass()}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {step === "contact" && (
            <>
              <h1 className="text-center text-lg font-bold text-gray-900 sm:text-xl">
                Comment vous joindre ?
              </h1>
              <p className="mt-1.5 mb-6 px-1 text-center text-sm text-gray-500">
                Optionnel, vous pourrez compléter plus tard.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-900">
                    Téléphone
                  </label>
                  <input
                    autoFocus
                    value={draft.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="+243 ..."
                    className={inputClass()}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-900">
                    Email de contact
                  </label>
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="contact@etablissement.cd"
                    className={inputClass()}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-900">
                    Site web
                  </label>
                  <input
                    value={draft.website}
                    onChange={(e) => update("website", e.target.value)}
                    placeholder="https://..."
                    className={inputClass()}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-900">
                    Description
                  </label>
                  <textarea
                    value={draft.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Quelques mots sur votre établissement..."
                    rows={3}
                    className={inputClass()}
                  />
                </div>
              </div>
            </>
          )}

          {step === "abonnement" && (
            <>
              <h1 className="text-center text-lg font-bold text-gray-900 sm:text-xl">
                Essai gratuit ou abonnement ?
              </h1>
              <p className="mt-1.5 mb-6 px-1 text-center text-sm text-gray-500">
                Vous pouvez démarrer gratuitement et payer plus tard.
              </p>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => update("subscriptionChoice", "trial")}
                  className={`w-full cursor-pointer rounded-lg border p-3.5 text-left transition-colors ${
                    draft.subscriptionChoice === "trial"
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <p className="font-semibold">Essai gratuit — 7 jours</p>
                  <p
                    className={`text-xs ${
                      draft.subscriptionChoice === "trial" ? "text-gray-300" : "text-gray-500"
                    }`}
                  >
                    Sans carte bancaire, accès complet.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => update("subscriptionChoice", "paid")}
                  className={`w-full cursor-pointer rounded-lg border p-3.5 text-left transition-colors ${
                    draft.subscriptionChoice === "paid"
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <p className="font-semibold">Je souhaite payer maintenant</p>
                  <p
                    className={`text-xs ${
                      draft.subscriptionChoice === "paid" ? "text-gray-300" : "text-gray-500"
                    }`}
                  >
                    Déclarez votre paiement, un conseiller vous contactera.
                  </p>
                </button>
              </div>

              {draft.subscriptionChoice === "paid" && (
                <div className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs text-amber-800">
                    Le paiement en ligne n&apos;est pas encore automatisé : cette étape
                    enregistre votre intention, notre équipe vous contactera pour finaliser.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-900">
                        Montant
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={draft.paymentAmount}
                        onChange={(e) => update("paymentAmount", e.target.value)}
                        placeholder="ex: 50"
                        className={inputClass()}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-900">
                        Devise
                      </label>
                      <input
                        value={draft.paymentDevise}
                        onChange={(e) => update("paymentDevise", e.target.value)}
                        placeholder="USD"
                        className={inputClass()}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-900">
                      Durée couverte
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_PERIODS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => update("paymentPeriodDays", p.value)}
                          className={`cursor-pointer rounded-lg border py-2 text-xs font-medium transition-colors ${
                            draft.paymentPeriodDays === p.value
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-300 text-gray-700 hover:bg-white"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-900">
                      Méthode de paiement
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {PAYMENT_METHODS.map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => update("paymentMethod", m.value)}
                          className={`cursor-pointer rounded-lg border py-2 text-xs font-medium transition-colors ${
                            draft.paymentMethod === m.value
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-300 text-gray-700 hover:bg-white"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <button
            type="button"
            disabled={loading}
            onClick={step === "abonnement" ? handleSubmit : goNext}
            className="mt-6 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 active:bg-gray-950 disabled:opacity-60"
          >
            {loading
              ? "Création en cours..."
              : step === "abonnement"
                ? draft.subscriptionChoice === "paid"
                  ? "Créer mon établissement"
                  : "Démarrer mon essai gratuit"
                : "Continuer"}
            {!loading && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
