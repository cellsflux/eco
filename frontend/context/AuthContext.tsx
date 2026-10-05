"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type PublicUser = {
  id: string;
  username: string;
  sname: string;
  lname: string;
  gender: string;
  photo: string;
  email: string;
  isEmailVerified: boolean;
  isProfileComplete: boolean;
  provider: "password" | "google" | "apple";
};

export type Etablissement = {
  id: string;
  owen: string;
  users: { user: string; role: string[] }[];
  name: string;
  slug: string;
  logo: string;
  type: string;
  pays: string;
  province: string;
  ville: string;
  adresse_complete: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  owener_name: string;
  owener_phone: string;
  maticule_prefix: string;
  matricule_lengh: number;
  money: { name: string; symbole: string; Taux_dollar: string }[];
  subscriptionStatus: "none" | "trial" | "active" | "expired";
  trialEndsAt: string | null;
  abonement: {
    amount: number;
    devise: string;
    from_method: string;
    description: string;
    date_debut: string;
    date_fin: string;
  }[];
  role: string | string[] | null;
};

type AuthContextValue = {
  user: PublicUser | null;
  // Un utilisateur peut posséder ou appartenir à PLUSIEURS établissements.
  etablissements: Etablissement[];
  accessToken: string | null;
  isLoading: boolean;
  setSession: (
    accessToken: string,
    user: PublicUser,
    etablissements?: Etablissement[],
  ) => void;
  setEtablissements: (etablissements: Etablissement[]) => void;
  addEtablissement: (etablissement: Etablissement) => void;
  updateEtablissement: (etablissement: Etablissement) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [etablissements, setEtablissementsState] = useState<Etablissement[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Au montage: tente de restaurer la session via le cookie httpOnly
  // (refresh token) sans jamais exposer ce cookie au JS. Le backend renvoie
  // systématiquement user + etablissements ensemble (voir buildSessionPayload
  // côté backend), donc un seul appel suffit à tout restaurer.
  useEffect(() => {
    let cancelled = false;

    async function tryRestoreSession() {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        const data = await res.json();

        if (!cancelled && res.ok && data.accessToken) {
          setAccessToken(data.accessToken);
          setUser(data.user);
          setEtablissementsState(data.etablissements ?? []);
        }
      } catch {
        // Pas de session active, on reste déconnecté silencieusement.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    tryRestoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const setSession = useCallback(
    (token: string, sessionUser: PublicUser, sessionEtabs?: Etablissement[]) => {
      setAccessToken(token);
      setUser(sessionUser);
      if (sessionEtabs !== undefined) {
        setEtablissementsState(sessionEtabs);
      }
    },
    [],
  );

  const setEtablissements = useCallback((etabs: Etablissement[]) => {
    setEtablissementsState(etabs);
  }, []);

  const addEtablissement = useCallback((etab: Etablissement) => {
    setEtablissementsState((prev) => [etab, ...prev]);
  }, []);

  const updateEtablissement = useCallback((etab: Etablissement) => {
    setEtablissementsState((prev) => prev.map((e) => (e.id === etab.id ? etab : e)));
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setAccessToken(null);
    setUser(null);
    setEtablissementsState([]);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        etablissements,
        accessToken,
        isLoading,
        setSession,
        setEtablissements,
        addEtablissement,
        updateEtablissement,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
