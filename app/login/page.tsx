"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { isLoggedIn, login, loginError } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggedIn) router.replace("/");
  }, [isLoggedIn, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setLocalError(null);
    setSubmitting(true);
    const ok = await login(email.trim(), password);
    setSubmitting(false);
    if (!ok) {
      setLocalError(loginError || "Invalid email or password");
      return;
    }
    router.replace("/");
  }

  const error = localError || loginError;

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-5">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold mb-6">Sign in</h1>

        <label className="block">
          <span className="block text-sm mb-1">Email</span>
          <input
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-11 bg-transparent border border-white/20 px-3 text-sm focus:outline-none focus:border-white"
          />
        </label>

        <label className="block">
          <span className="block text-sm mb-1">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full h-11 bg-transparent border border-white/20 px-3 text-sm focus:outline-none focus:border-white"
          />
        </label>

        {error ? (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || !email || !password}
          className="w-full h-11 bg-white text-black text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
