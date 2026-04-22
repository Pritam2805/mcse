"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useAuth as useClerkAuth, useUser, useClerk } from "@clerk/nextjs";
import { registerTokenGetter } from "@/lib/api";

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
  const { signOut } = useClerk();

  // Register Clerk's getToken with the API client so every request gets a Bearer token
  useEffect(() => {
    registerTokenGetter(() => getToken());
  }, [getToken]);

  const rawRole = user?.publicMetadata?.role;
  const role = deriveRole(rawRole);
  const userName = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username || null : null;
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? null;

  const login = () => {
    window.location.href = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/sign-in";
  };

  const logout = () => {
    signOut({ redirectUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL });
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
