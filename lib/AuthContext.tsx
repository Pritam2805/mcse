"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth as useClerkAuth, useUser, useClerk } from "@clerk/nextjs";
import { bootstrapInvestor, registerTokenGetter } from "@/lib/api";
import { getPreviewSession, previewLogin, previewLogout, type PreviewSession } from "@/lib/previewAuth";
import { getAeonSession, aeonLogin, aeonLogout, type AeonSession } from "@/lib/aeonAuth";

export type UserRole = "user" | "company" | "admin";

interface AuthState {
  isLoggedIn: boolean;
  /** True on first render until we've checked localStorage / Clerk for a session. */
  authReady: boolean;
  role: UserRole | null;
  /**
   * For company-role users, the ticker of the holding company they control
   * (e.g. "ENIGMA"). Null otherwise. Parsed from the raw session role string
   * `company:<TICKER>`.
   */
  companyTicker: string | null;
  userName: string | null;
  userEmail: string | null;
  login: (username?: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loginError: string | null;
}

const defaultState: AuthState = {
  isLoggedIn: false,
  authReady: false,
  role: null,
  companyTicker: null,
  userName: null,
  userEmail: null,
  login: async () => false,
  logout: async () => {},
  loginError: null,
};

const AuthContext = createContext<AuthState>(defaultState);

const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE;
const IS_PREVIEW = AUTH_MODE === "preview";
const IS_AEON = AUTH_MODE === "aeon";

function deriveRole(raw: unknown): UserRole | null {
  if (typeof raw !== "string") return null;
  if (raw === "admin") return "admin";
  if (raw.startsWith("company:")) return "company";
  if (raw === "investor" || raw === "user") return "user";
  return null;
}

function deriveCompanyTicker(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (!raw.startsWith("company:")) return null;
  const ticker = raw.slice("company:".length).trim();
  return ticker.length > 0 ? ticker.toUpperCase() : null;
}

// ─── Clerk-backed provider (production path, unchanged behavior) ────────────

function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded: clerkLoaded, getToken } = useClerkAuth();
  const { user } = useUser();
  const { signOut, redirectToSignIn } = useClerk();

  useEffect(() => {
    registerTokenGetter(() => getToken());
  }, [getToken]);

  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (!isSignedIn || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    bootstrapInvestor().catch(() => {
      bootstrappedRef.current = false;
    });
  }, [isSignedIn]);

  const rawRole = user?.publicMetadata?.role;
  const role = deriveRole(rawRole);
  const userName = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username || null : null;
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? null;

  const login = async () => {
    const returnTo = typeof window !== "undefined" ? `${window.location.origin}/` : "/";
    redirectToSignIn({ redirectUrl: returnTo });
    return true;
  };

  const logout = async () => {
    await signOut();
  };

  const value = useMemo<AuthState>(() => ({
    isLoggedIn: isSignedIn ?? false,
    authReady: clerkLoaded ?? false,
    role,
    companyTicker: deriveCompanyTicker(rawRole),
    userName,
    userEmail,
    login,
    logout,
    loginError: null,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [isSignedIn, clerkLoaded, role, userName, userEmail]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Preview-mode provider (no Clerk imports at runtime via tree-shake) ─────

function PreviewAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PreviewSession | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    setSession(getPreviewSession());
    setAuthReady(true);
  }, []);

  useEffect(() => {
    registerTokenGetter(async () => getPreviewSession()?.token ?? null);
  }, []);

  useEffect(() => {
    if (!session || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    bootstrapInvestor().catch(() => {
      bootstrappedRef.current = false;
    });
  }, [session]);

  const login = async (username?: string, password?: string): Promise<boolean> => {
    setLoginError(null);
    if (!username || !password) {
      setLoginError("Enter username and password");
      return false;
    }
    const result = await previewLogin(username, password);
    if (result.ok) {
      setSession(result.session);
      return true;
    }
    setLoginError(result.error);
    return false;
  };

  const logout = async () => {
    await previewLogout();
    setSession(null);
  };

  const role = deriveRole(session?.user.role);
  const value: AuthState = {
    isLoggedIn: !!session,
    authReady,
    role,
    companyTicker: deriveCompanyTicker(session?.user.role),
    userName: session?.user.name ?? null,
    userEmail: session?.user.email ?? null,
    login,
    logout,
    loginError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Aeon-mode provider (mu-aeon event-auth bridge) ─────────────────────────

function AeonAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AeonSession | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const bootstrappedRef = useRef(false);

  // Restore session from localStorage on mount — guarantees reload doesn't
  // nullify the logged-in state.
  useEffect(() => {
    setSession(getAeonSession());
    setAuthReady(true);
  }, []);

  useEffect(() => {
    registerTokenGetter(async () => getAeonSession()?.token ?? null);
  }, []);

  useEffect(() => {
    if (!session || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    bootstrapInvestor().catch(() => {
      bootstrappedRef.current = false;
    });
  }, [session]);

  const login = async (email?: string, password?: string): Promise<boolean> => {
    setLoginError(null);
    if (!email || !password) {
      setLoginError("Enter email and password");
      return false;
    }
    const result = await aeonLogin(email, password);
    if (result.ok) {
      setSession(result.session);
      return true;
    }
    setLoginError(result.error);
    return false;
  };

  const logout = async () => {
    await aeonLogout();
    setSession(null);
  };

  const role = deriveRole(session?.user.role);
  const value: AuthState = {
    isLoggedIn: !!session,
    authReady,
    role,
    companyTicker: deriveCompanyTicker(session?.user.role),
    userName: session?.user.name ?? null,
    userEmail: session?.user.email ?? null,
    login,
    logout,
    loginError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Top-level switch ───────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  if (IS_AEON) return <AeonAuthProvider>{children}</AeonAuthProvider>;
  if (IS_PREVIEW) return <PreviewAuthProvider>{children}</PreviewAuthProvider>;
  return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
