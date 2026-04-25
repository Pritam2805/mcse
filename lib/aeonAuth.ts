/**
 * Aeon-mode auth (no Clerk, no dev-login).
 *
 * Active when NEXT_PUBLIC_AUTH_MODE === "aeon". POSTs email/password to the
 * Next.js route /api/auth/aeon-login, which validates with the Aeon event-auth
 * API and provisions a Convex session. The returned { token, tokenHash, user }
 * is stored in localStorage and handed back to the API client via
 * registerTokenGetter (same shape as previewAuth).
 */

const STORAGE_KEY = "mcse_aeon_session";

export interface AeonUser {
  userId: string;
  username: string;
  name: string;
  email: string;
  role: string;
}

export interface AeonSession {
  token: string;
  tokenHash?: string;
  user: AeonUser;
}

export function getAeonSession(): AeonSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AeonSession;
    if (!parsed.token || !parsed.user?.userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function aeonLogin(
  email: string,
  password: string,
): Promise<{ ok: true; session: AeonSession } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await fetch("/api/auth/aeon-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return { ok: false, error: "Network error" };
  }

  if (!res.ok) {
    let msg = `Login failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      /* keep default */
    }
    return { ok: false, error: msg };
  }

  const body = (await res.json()) as AeonSession;
  if (!body.token || !body.user) return { ok: false, error: "Malformed server response" };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(body));
  return { ok: true, session: body };
}

export async function aeonLogout(): Promise<void> {
  if (typeof window === "undefined") return;
  const session = getAeonSession();
  const token = session?.token;

  // Best-effort server-side revoke so the Bearer token can't be replayed.
  if (token) {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      /* ignore; local clear still proceeds */
    }
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
