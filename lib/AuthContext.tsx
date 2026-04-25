"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export type UserRole = "user" | "company" | "admin";

interface AuthState {
  isLoggedIn: boolean;
  role: UserRole | null;
  userName: string | null;
  userEmail: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  isLoggedIn: false,
  role: null,
  userName: null,
  userEmail: null,
  loading: true,
  login: async () => ({ ok: false, error: "AuthProvider not mounted" }),
  logout: async () => {},
});

function nameFromEmail(email: string | null): string | null {
  if (!email) return null;
  const local = email.split("@")[0] ?? "";
  if (!local) return email;
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" });
      const data = await res.json();
      setEmail(data?.authenticated && typeof data.email === "string" ? data.email : null);
    } catch {
      setEmail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Hydrate from cookie on mount and whenever the tab regains focus,
  // so reload / multi-tab logout stays in sync.
  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const login = useCallback(
    async (emailInput: string, password: string) => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailInput, password }),
          credentials: "same-origin",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
          return { ok: false as const, error: typeof data?.error === "string" ? data.error : "Login failed" };
        }
        setEmail(typeof data.email === "string" ? data.email : emailInput.toLowerCase());
        return { ok: true as const };
      } catch {
        return { ok: false as const, error: "Network error" };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      // ignore — clear local state regardless
    }
    setEmail(null);
    router.push("/login");
  }, [router]);

  const value = useMemo<AuthState>(
    () => ({
      isLoggedIn: email !== null,
      role: null,
      userName: nameFromEmail(email),
      userEmail: email,
      loading,
      login,
      logout,
    }),
    [email, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
