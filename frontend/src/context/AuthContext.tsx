import React, { createContext, useContext, useEffect, useState } from "react";
import { storage } from "@/src/utils/storage";
import { api, TOKEN_KEY } from "@/src/api";

type AuthState = {
  token: string | null;
  email: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const saved = await storage.secureGet<string>(TOKEN_KEY, "");
      if (saved) {
        setToken(saved);
        try {
          const me = await api.me();
          setEmail(me.email);
        } catch {
          await storage.secureRemove(TOKEN_KEY);
          setToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const signIn = async (e: string, p: string) => {
    const res = await api.login(e, p);
    await storage.secureSet(TOKEN_KEY, res.access_token);
    setToken(res.access_token);
    setEmail(res.email);
  };

  const signOut = async () => {
    await storage.secureRemove(TOKEN_KEY);
    setToken(null);
    setEmail(null);
  };

  return (
    <AuthContext.Provider value={{ token, email, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
