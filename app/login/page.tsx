"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";

const IS_PREVIEW = process.env.NEXT_PUBLIC_AUTH_MODE === "preview";

// Send the user to the right landing surface based on their role.
//   admin / company → /admin (admin or company dashboard)
//   investor / user → /     (Explore)
function landingFor(role: string | null): string {
  if (role === "admin" || role === "company") return "/admin";
  return "/";
}

export default function LoginPage() {
  const { isLoggedIn, role, login, loginError } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already signed in (e.g. user navigates back to /login), bounce to the
  // role-appropriate landing page.
  useEffect(() => {
    if (isLoggedIn) router.replace(landingFor(role));
  }, [isLoggedIn, role, router]);

  async function onPreviewSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const ok = await login(username, password);
    setSubmitting(false);
    // Note: at this exact instant the AuthContext may not have flipped the
    // role yet (state update is async). The useEffect above will fire as
    // soon as it does and re-route correctly. As a fast path we read the
    // username pattern locally so admin/company go straight to /admin.
    if (ok) {
      const lower = username.trim().toLowerCase();
      const fast =
        lower === "admin" || lower.startsWith("admin-") || lower.startsWith("co-")
          ? "/admin"
          : "/";
      router.replace(fast);
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-5">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center gap-3 mb-10">
          <Image
            src="/Layer 11.png"
            alt="MCSE"
            width={44}
            height={44}
            className="w-11 h-11 object-contain"
            priority
          />
          <span className="font-[MonumentExtended] text-[13px] tracking-[0.2em] uppercase">MCSE</span>
        </div>

        <h1 className="font-[var(--font-anton)] text-3xl tracking-[0.08em] uppercase mb-2">
          WELCOME BACK
        </h1>
        <p className="text-[11px] tracking-[0.1em] text-white/40 mb-8">
          {IS_PREVIEW ? "PREVIEW ENVIRONMENT — USE YOUR TEST CREDENTIALS" : "SIGN IN TO ACCESS YOUR PORTFOLIO"}
        </p>

        {IS_PREVIEW ? (
          <form onSubmit={onPreviewSubmit} className="space-y-3">
            <label className="block">
              <span className="text-[10px] tracking-[0.2em] text-white/40 uppercase">Username</span>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full h-11 bg-transparent border border-white/20 px-3 text-sm focus:outline-none focus:border-white"
                required
              />
            </label>
            <label className="block">
              <span className="text-[10px] tracking-[0.2em] text-white/40 uppercase">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full h-11 bg-transparent border border-white/20 px-3 text-sm focus:outline-none focus:border-white"
                required
              />
            </label>
            {loginError ? (
              <p className="text-[10px] tracking-[0.1em] uppercase text-red-400">{loginError}</p>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-white text-black text-[11px] tracking-[0.2em] font-semibold uppercase hover:bg-transparent hover:text-white border border-white transition-all duration-200 disabled:opacity-50"
            >
              {submitting ? "SIGNING IN…" : "SIGN IN"}
            </button>
          </form>
        ) : (
          <button
            onClick={() => login()}
            className="w-full h-12 bg-white text-black text-[11px] tracking-[0.2em] font-semibold uppercase hover:bg-transparent hover:text-white border border-white transition-all duration-200"
          >
            SIGN IN WITH MCSE
          </button>
        )}

        <div className="mt-6 text-center">
          <p className="text-[10px] tracking-[0.1em] text-white/30 mb-3">DON&apos;T HAVE AN ACCOUNT?</p>
          <a
            href="https://www.mu-aeon.com/events?event=mcse"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full h-11 leading-[2.75rem] border border-white/20 text-[10px] tracking-[0.2em] text-white/50 font-semibold uppercase hover:border-white hover:text-white transition-all duration-200"
          >
            REGISTER
          </a>
        </div>

        <p className="text-[10px] tracking-[0.1em] text-white/20 text-center mt-6">
          MATH CLUB STOCK EXCHANGE
        </p>
      </motion.div>
    </div>
  );
}
