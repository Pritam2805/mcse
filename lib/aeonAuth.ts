/**
 * Aeon-mode auth.
 *
 * Active when NEXT_PUBLIC_AUTH_MODE === "aeon". POSTs {email, password} to the
 * server-side bridge at /auth/aeon-login (which validates against mu-aeon and
 * provisions a Convex session). Stores the returned token in localStorage so
 * a page reload restores the session — no nullification on refresh.
 *
 * Uses the same STORAGE_KEY as previewAuth so the surrounding code (token
 * getters, hooks, etc.) doesn't need to change.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const STORAGE_KEY = "mcse_preview_session";

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
  if (!API_BASE) return { ok: false, error: "API base URL not configured" };
  if (!email || !password) {
    return { ok: false, error: "Enter email and password" };
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/aeon-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return { ok: false, error: "Network error" };
  }

  if (res.status === 401) {
    return { ok: false, error: "Invalid email or password" };
  }
  if (res.status === 429) {
    return { ok: false, error: "Too many attempts. Try again in a few minutes." };
  }
  if (res.status === 502) {
    return { ok: false, error: "Auth provider unreachable. Try again." };
  }
  if (!res.ok) return { ok: false, error: `Login failed (${res.status})` };

  const body = (await res.json()) as AeonSession;
  if (!body.token || !body.user) {
    return { ok: false, error: "Malformed server response" };
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(body));
  return { ok: true, session: body };
}

export async function aeonLogout(): Promise<void> {
  if (typeof window === "undefined") return;
  const session = getAeonSession();
  const token = session?.token;

  if (token) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      /* ignore — local logout still proceeds */
    }
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
