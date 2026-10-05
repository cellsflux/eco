"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronLeft, MailCheck } from "lucide-react";

const OTP_LENGTH = 6;

export function OtpScreen({
  email,
  purpose,
  onBack,
  onVerified,
}: {
  email: string;
  purpose: "signup" | "login";
  onBack: () => void;
  onVerified: (accessToken: string, user: unknown, etablissements?: unknown) => void;
}) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const otp = useMemo(() => digits.join(""), [digits]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function verify(fullOtp: string) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: fullOtp, purpose }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Code invalide.");
        setDigits(Array(OTP_LENGTH).fill(""));
        inputsRef.current[0]?.focus();
        return;
      }

      onVerified(data.accessToken, data.user, data.etablissements);
    } catch {
      setError("Une erreur réseau est survenue.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(index: number, value: string) {
    const clean = value.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);

    if (clean && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    const joined = next.join("");
    if (joined.length === OTP_LENGTH) {
      verify(joined);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH)
      .fill("")
      .map((_, i) => pasted[i] || "");
    setDigits(next);
    const joined = next.join("");
    if (joined.length === OTP_LENGTH) verify(joined);
  }

  async function handleResend() {
    setError("");
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Impossible de renvoyer le code.");
        return;
      }

      setCooldown(45);
    } catch {
      setError("Une erreur réseau est survenue.");
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
              <MailCheck className="h-5 w-5 text-white sm:h-6 sm:w-6" />
            </div>
          </div>

          <h1 className="text-center text-lg font-bold text-gray-900 sm:text-xl">
            Vérifiez votre email
          </h1>
          <p className="mt-1.5 mb-8 px-1 text-center text-sm text-gray-500">
            Entrez le code à 6 chiffres envoyé à{" "}
            <span className="font-medium text-gray-800">{email}</span>
          </p>

          <div className="mb-6 flex justify-center gap-2" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el;
                }}
                inputMode="numeric"
                maxLength={1}
                value={d}
                disabled={loading}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-12 w-10 rounded-lg border border-gray-300 text-center text-lg font-semibold text-gray-900 focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:outline-none sm:h-14 sm:w-12"
              />
            ))}
          </div>

          {error && (
            <p className="mb-4 text-center text-sm text-red-600">{error}</p>
          )}

          {loading && (
            <p className="mb-2 text-center text-sm text-gray-400">
              Vérification en cours...
            </p>
          )}

          <div className="text-center text-sm text-gray-500">
            {cooldown > 0 ? (
              <span>Renvoyer le code dans {cooldown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="cursor-pointer font-medium text-gray-900 hover:underline"
              >
                Renvoyer le code
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
