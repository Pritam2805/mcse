"use client";

import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { AlertTriangle } from "lucide-react";

function LoginForm() {
  const { isLoggedIn, loading, login } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && isLoggedIn) router.replace(next);
  }, [loading, isLoggedIn, router, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);
    if (res.ok) {
      router.replace(next);
    } else {
      setError(res.error);
    }
  }

  return (
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
        SIGN IN WITH YOUR AEON EVENT CREDENTIALS
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] tracking-[0.15em] text-white/40 block mb-2">EMAIL</label>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 bg-white/5 border border-white/10 px-3 text-xs text-white outline-none placeholder:text-white/20 focus:border-white/40 transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="text-[10px] tracking-[0.15em] text-white/40 block mb-2">PASSWORD</label>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-11 bg-white/5 border border-white/10 px-3 text-xs text-white outline-none placeholder:text-white/20 focus:border-white/40 transition-colors"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 border border-down/30 bg-down/10 text-[11px] text-down">
            <AlertTriangle size={13} />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={`w-full h-12 text-[11px] tracking-[0.2em] font-semibold uppercase border transition-all duration-200 ${
            submitting
              ? "bg-white/20 text-white/50 border-white/20 cursor-not-allowed"
              : "bg-white text-black border-white hover:bg-transparent hover:text-white"
          }`}
        >
          {submitting ? "SIGNING IN..." : "SIGN IN"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-[10px] tracking-[0.1em] text-white/30 mb-3">DON&apos;T HAVE AN ACCOUNT?</p>
        <a
          href="https://www.mu-aeon.com/events?event=mcse"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block w-full h-11 leading-[2.75rem] border border-white/20 text-[10px] tracking-[0.2em] text-white/50 font-semibold uppercase hover:border-white hover:text-white transition-all duration-200"
        >
          REGISTER ON AEON
        </a>
      </div>

      <p className="text-[10px] tracking-[0.1em] text-white/20 text-center mt-6">
        MATH CLUB STOCK EXCHANGE
      </p>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-5">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
