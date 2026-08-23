import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { Platform, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";

import { storage } from "@/src/utils/storage";
import { api, TOKEN_KEY, setMemToken } from "@/src/api";

WebBrowser.maybeCompleteAuthSession();

export type User = {
  user_id: string;
  email: string;
  name: string;
  picture: string;
  role: "company_admin" | "customer";
};

type AuthState = {
  user: User | null;
  loading: boolean;
  authInProgress: boolean;
  signInPassword: (email: string, password: string) => Promise<User>;
  signInGoogle: () => Promise<void>;
  signInApple: () => Promise<User>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({} as AuthState);

const AUTH_BASE = "https://auth.emergentagent.com/";

function extractSessionId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/[?#&]session_id=([^&#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInProgress, setAuthInProgress] = useState(false);
  const processed = useRef<Set<string>>(new Set());

  const persistToken = useCallback(async (token: string) => {
    setMemToken(token);
    await storage.secureSet(TOKEN_KEY, token);
  }, []);

  const processGoogleSession = useCallback(
    async (sessionId: string) => {
      if (processed.current.has(sessionId)) return;
      processed.current.add(sessionId);
      const res = await api.googleSession(sessionId);
      await persistToken(res.session_token);
      setUser(res.user);
    },
    [persistToken]
  );

  // Mount: web session_id detection first, else restore stored session
  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === "web") {
          const raw = window.location.hash + window.location.search;
          const sid = extractSessionId(raw);
          if (sid) {
            await processGoogleSession(sid);
            // clean only session_id from the URL, keep everything else
            const clean = window.location.href.replace(/([?#&])session_id=[^&#]+/, "$1").replace(/[?#&]$/, "");
            window.history.replaceState(window.history.state, "", clean);
            setLoading(false);
            return;
          }
        } else {
          const initial = await Linking.getInitialURL();
          const sid = extractSessionId(initial);
          if (sid) await processGoogleSession(sid);
        }

        const saved = await storage.secureGet<string>(TOKEN_KEY, "");
        if (saved) {
          setMemToken(saved);
          try {
            const me = await api.me();
            setUser(me);
          } catch {
            setMemToken(null);
            await storage.secureRemove(TOKEN_KEY);
          }
        }
      } finally {
        setLoading(false);
      }
    })();

    // hot deep links on native
    const sub = Linking.addEventListener("url", ({ url }) => {
      const sid = extractSessionId(url);
      if (sid) processGoogleSession(sid).catch(() => {});
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInPassword = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password);
      await persistToken(res.session_token);
      setUser(res.user);
      return res.user as User;
    },
    [persistToken]
  );

  const signInGoogle = useCallback(async () => {
    setAuthInProgress(true);
    try {
      const redirectUrl =
        Platform.OS === "web" ? window.location.origin + "/" : Linking.createURL("");
      const authUrl = `${AUTH_BASE}?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === "web") {
        window.location.href = authUrl;
        return;
      }

      let captured: string | null = null;
      const sub = Linking.addEventListener("url", ({ url }) => {
        if (!captured) captured = url;
      });
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      sub.remove();

      let sid = extractSessionId((result as any)?.url);
      if (!sid) sid = extractSessionId(captured);
      if (!sid) sid = extractSessionId(await Linking.getInitialURL());
      if (sid) await processGoogleSession(sid);
    } finally {
      setAuthInProgress(false);
    }
  }, [processGoogleSession]);

  const signInApple = useCallback(async () => {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    const name = credential.fullName
      ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(" ")
      : null;
    const res = await api.appleLogin({
      identity_token: credential.identityToken as string,
      name: name || null,
      email: credential.email || null,
    });
    await persistToken(res.session_token);
    setUser(res.user);
    return res.user as User;
  }, [persistToken]);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    setMemToken(null);
    await storage.secureRemove(TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, authInProgress, signInPassword, signInGoogle, signInApple, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
