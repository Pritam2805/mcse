"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";

export default function LoginPage() {
  const { isLoggedIn, login } = useAuth();
  const router = useRouter();

  // Already signed in — go to home
  useEffect(() => {
    if (isLoggedIn) router.replace("/");
  }, [isLoggedIn, router]);

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
          SIGN IN TO ACCESS YOUR PORTFOLIO
        </p>

        <button
          onClick={login}
          className="w-full h-12 bg-white text-black text-[11px] tracking-[0.2em] font-semibold uppercase hover:bg-transparent hover:text-white border border-white transition-all duration-200"
        >
          SIGN IN WITH MCSE
        </button>

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
