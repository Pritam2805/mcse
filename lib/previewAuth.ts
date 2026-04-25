/**
 * Preview-mode auth (no Clerk).
 *
 * Active when NEXT_PUBLIC_AUTH_MODE === "preview". POSTs username/password to
 * the backend's /auth/dev-login endpoint (which exists only when the backend
 * also runs with DEV_AUTH_MODE=true), stores the returned JWT in localStorage,
 * and hands it back to the API client via registerTokenGetter.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const STORAGE_KEY = "mcse_preview_session";

export interface PreviewUser {
  userId: string;
  username: string;
  name: string;
  email: string;
  role: string;
}

export interface PreviewSession {
  token: string;
  /**
   * SHA-256 of `token`. Set by the server at login so we don't need to
   * compute it client-side (Web Crypto is unavailable on non-HTTPS LAN hosts).
   * Optional for backward-compat with sessions created before this field existed.
   */
  tokenHash?: string;
  user: PreviewUser;
}

export function getPreviewSession(): PreviewSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PreviewSession;
    if (!parsed.token || !parsed.user?.userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function previewLogin(
  username: string,
  password: string,
): Promise<{ ok: true; session: PreviewSession } | { ok: false; error: string }> {
  if (!API_BASE) return { ok: false, error: "API base URL not configured" };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/dev-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    return { ok: false, error: "Network error" };
  }

  if (res.status === 404) return { ok: false, error: "Preview auth disabled on server" };
  if (res.status === 401) return { ok: false, error: "Invalid username or password" };
  if (!res.ok) return { ok: false, error: `Login failed (${res.status})` };

  const body = (await res.json()) as PreviewSession;
  if (!body.token || !body.user) return { ok: false, error: "Malformed server response" };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(body));
  return { ok: true, session: body };
}

export async function previewLogout(): Promise<void> {
  if (typeof window === "undefined") return;
  const session = getPreviewSession();
  const token = session?.token;

  // Revoke the server-side session so the Bearer token can't be replayed.
  // Best-effort — if the network call fails we still clear local state.
  if (token) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      /* ignore network errors — local logout still proceeds */
    }
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
