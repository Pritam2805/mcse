"use client";

import { useEffect, useState } from "react";

/**
 * Session hash helper.
 *
 * The server returns `tokenHash` at login (`/api/auth/dev-login`) and we
 * persist it in localStorage alongside the raw token. This avoids needing
 * `crypto.subtle` in the browser — that API isn't available on non-HTTPS
 * LAN hosts (e.g. http://10.70.27.212:3000), which would otherwise break
 * shared testing setups.
 */

const STORAGE_KEY = "mcse_preview_session";

interface StoredSession {
  token?: string;
  tokenHash?: string;
}

function readStored(): StoredSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

/**
 * Returns `{ hash, ready }`.
 *   • `ready = false` means we haven't yet attempted to read localStorage.
 *   • `ready = true, hash = null`  means the user isn't logged in.
 *   • `ready = true, hash = "..."` means the session hash is available.
 *
 * Pass `hash` to Convex queries that identify the session, and gate
 * UI loading states on `ready` so pages don't hang when there's no
 * active session.
 */
export function useTokenHash(): string | null {
  const [hash, setHash] = useState<string | null>(null);

  useEffect(() => {
    const stored = readStored();
    // Prefer server-provided hash (new format).
    if (stored?.tokenHash) {
      setHash(stored.tokenHash);
      return;
    }

    // Legacy session (no hash stored). Fall back to client-side hashing if
    // Web Crypto is available; otherwise leave hash null — the user will
    // need to log out + back in to get a fresh session with a stored hash.
    const raw = stored?.token;
    if (!raw) {
      setHash(null);
      return;
    }

    if (typeof crypto !== "undefined" && crypto.subtle) {
      let cancelled = false;
      crypto.subtle
        .digest("SHA-256", new TextEncoder().encode(raw))
        .then((buf) => {
          if (cancelled) return;
          const hex = Array.from(new Uint8Array(buf))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          setHash(hex);
        })
        .catch(() => {
          if (!cancelled) setHash(null);
        });
      return () => {
        cancelled = true;
      };
    }
    // No crypto.subtle (non-secure origin) and no server-provided hash.
    // User needs to re-login to get a fresh session with the hash field.
    setHash(null);
  }, []);

  return hash;
}
