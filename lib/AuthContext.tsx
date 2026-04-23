"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useAuth as useClerkAuth, useUser, useClerk } from "@clerk/nextjs";
import { bootstrapInvestor, registerTokenGetter } from "@/lib/api";

export type UserRole = "user" | "company" | "admin";

interface AuthState {
  isLoggedIn: boolean;
  role: UserRole | null;
  userName: string | null;
  userEmail: string | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  isLoggedIn: false,
  role: null,
  userName: null,
  userEmail: null,
  login: () => {},
  logout: () => {},
});

function deriveRole(raw: unknown): UserRole | null {
  if (typeof raw !== "string") return null;
  if (raw === "admin") return "admin";
  if (raw.startsWith("company:")) return "company";
  if (raw === "investor" || raw === "user") return "user";
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, getToken } = useClerkAuth();
  const { user } = useUser();
  const { signOut, redirectToSignIn } = useClerk();

  // Register Clerk's getToken with the API client so every request gets a Bearer token
  useEffect(() => {
    registerTokenGetter(() => getToken());
  }, [getToken]);

  // First-login bootstrap: POST /auth/login provisions the investors row + seeds
  // ₹100k starting cash on the backend. Without this, IPO apply / order placement
  // fails with FK violations on the investors table. Idempotent server-side, but
  // we still gate per-session with a ref to avoid noisy refires across remounts.
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (!isSignedIn || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    bootstrapInvestor().catch(() => {
      // Failure here means investor-only endpoints will 4xx; allow a retry next mount.
      bootstrappedRef.current = false;
    });
  }, [isSignedIn]);

  const rawRole = user?.publicMetadata?.role;
  const role = deriveRole(rawRole);
  const userName = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username || null : null;
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? null;

  const login = () => {
    // On a Clerk satellite, redirectToSignIn() builds the cross-domain handshake URL
    // (with __clerk_satellite_url + redirect_url back to this origin) so the user
    // returns to mcse.in after authenticating on mu-aeon.com.
    const returnTo = typeof window !== "undefined" ? `${window.location.origin}/` : "/";
    redirectToSignIn({ redirectUrl: returnTo });
  };

  const logout = () => {
    const returnTo = typeof window !== "undefined" ? `${window.location.origin}/` : "/";
    signOut({ redirectUrl: returnTo });
  };

  const value = useMemo(() => ({
    isLoggedIn: isSignedIn ?? false,
    role,
    userName,
    userEmail,
    login,
    logout,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [isSignedIn, role, userName, userEmail]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
