"use client";

/**
 * NEWS APPROVAL — company + admin portal
 *
 * Two roles, one page:
 *   - role === "company": submit messages, track own history by status, paginated.
 *   - role === "admin":   see ALL company submissions live, approve / reject, paginated.
 *
 * Writes go through REST (`/api/company/news`, `/api/admin/news/:id/approve`,
 * `/api/admin/news/:id/reject`) — simple Bearer auth handled server-side.
 *
 * Reads are reactive Convex queries (`api.news.listMyNews`, `api.news.listAllNews`) —
 * when a write lands in Convex, ALL subscribed clients update within ~100ms.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Plus, Clock, CheckCircle, XCircle, User,
  ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { useQuery } from "convex/react";
import { useAuth } from "@/lib/AuthContext";
import { useTokenHash } from "@/lib/clientAuth";
import { parentDirectory } from "@/lib/mockData";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const PAGE_SIZE = 10;
// Full ticker universe — used by ADMIN role (which can post about any stock).
// Company role gets a filtered list of ONLY its own subsidiaries — derived
// at runtime from `parentDirectory[companyTicker].subsidiaries`.
const ALL_TICKERS = [
  "ESOFT","ECLOUD","ENAI","ERLEARN","ERPRESS","ERLAB",
  "MARCF","MARCM","MARCC","AMBR","AMBF","AMBL",
  "RBVX","RBVM","RBVA","CGNR","CGNA","CGNX",
  "GMRACE","GMAUTO","GMSERV","LLMED","LLRES","LLBIO",
  "AEROD","AEROP","AEROS","APXF","APXI","APXM",
  "ACMR","ACMS","ACMD","ADVT","ADVS","ADVX",
  "AUVS","AUVR","AUVM","MEDP","MEDD","MEDB",
  "AEIF","AEIA","AEIL","QBTR","QBTS","QBTC",
  "MSSTD","MSDIGI","MSMEDIA","EICF","EICI","EICM",
  "SYNS","SYNP","SYNI",
];

// ── Types ────────────────────────────────────────────────────────────────
type Status = "PENDING" | "APPROVED" | "REJECTED";
type Row = {
  id: Id<"news">;
  headline: string;
  body: string;
  relatedTickers: string[];
  status: Status;
  authorName: string | null;
  authorEmail: string | null;
  publishedAt: number;
  reviewedAt: number | null;
};

// Sort priority: PENDING first (most actionable), then APPROVED, then REJECTED.
// Within each status, newest first.
function sortForDisplay(rows: Row[]): Row[] {
  const priority: Record<Status, number> = { PENDING: 0, APPROVED: 1, REJECTED: 2 };
  return [...rows].sort((a, b) => {
    const pa = priority[a.status] - priority[b.status];
    if (pa !== 0) return pa;
    return b.publishedAt - a.publishedAt;
  });
}

function authToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("mcse_preview_session");
    if (!raw) return null;
    return (JSON.parse(raw) as { token?: string }).token ?? null;
  } catch {
    return null;
  }
}

// ── Page ─────────────────────────────────────────────────────────────────
export default function AdminNewsPage() {
  const { isLoggedIn, role, companyTicker } = useAuth();
  const router = useRouter();
  const tokenHash = useTokenHash();

  // For company users, restrict the ticker dropdown + the news feed scope to
  // only the subsidiaries of THEIR holding (e.g. ENIGMA → ESOFT/ECLOUD/ENAI).
  const allowedTickers: string[] = role === "admin"
    ? ALL_TICKERS
    : (companyTicker && parentDirectory[companyTicker]?.subsidiaries) || [];

  if (!isLoggedIn || role === "user") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="font-[var(--font-anton)] text-lg tracking-[0.1em] mb-2">ACCESS DENIED</p>
        <p className="text-[11px] text-white/40">You need admin or company privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] max-w-4xl mx-auto px-5 md:px-8 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push("/admin")} className="text-white/30 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-[var(--font-anton)] text-2xl tracking-[0.08em] uppercase">
            {role === "admin" ? "NEWS APPROVAL" : "MY NEWS"}
          </h1>
          <p className="text-[10px] tracking-[0.1em] text-white/30 mt-1">
            {role === "admin"
              ? "Live queue — review and approve company submissions"
              : "Submit articles and track approval status live"}
          </p>
        </div>
      </div>

      {role === "admin" && <AdminView tokenHash={tokenHash} />}
      {role === "company" && <CompanyView tokenHash={tokenHash} allowedTickers={allowedTickers} />}
    </div>
  );
}

// ── Company view ─────────────────────────────────────────────────────────
function CompanyView({
  tokenHash,
  allowedTickers,
}: {
  tokenHash: string | null;
  allowedTickers: string[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [tokenHashReady, setTokenHashReady] = useState(false);

  // Mark the hash as "checked" once the first render cycle settles. If after
  // one frame we still have no hash, the user has a legacy session (pre-hash
  // field) — show a CTA to re-login rather than hanging on LOADING forever.
  useEffect(() => {
    const t = setTimeout(() => setTokenHashReady(true), 200);
    return () => clearTimeout(t);
  }, []);

  // Reactive: refires whenever this company posts/approves/rejects anything.
  const raw = useQuery(
    api.news.listMyNews,
    tokenHash ? { tokenHash } : "skip",
  );
  // "Loading" only if we have a hash and the query hasn't resolved.
  const loading = tokenHash !== null && raw === undefined;
  // Missing-hash case — stale session, user needs to re-login.
  const missingHash = tokenHashReady && tokenHash === null;

  const rows: Row[] = useMemo(() => {
    if (!raw) return [];
    return raw.map((n) => ({
      id: n.id,
      headline: n.headline,
      body: n.body,
      relatedTickers: n.relatedTickers,
      status: normaliseStatus(n.status),
      authorName: null, // company viewing own work; no need to show self
      authorEmail: null,
      publishedAt: n.publishedAt,
      reviewedAt: n.reviewedAt,
    }));
  }, [raw]);

  const sorted = useMemo(() => sortForDisplay(rows), [rows]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const counts = useMemo(
    () => ({
      PENDING: rows.filter((r) => r.status === "PENDING").length,
      APPROVED: rows.filter((r) => r.status === "APPROVED").length,
      REJECTED: rows.filter((r) => r.status === "REJECTED").length,
    }),
    [rows],
  );

  return (
    <div>
      {/* Header action + stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-4 text-[10px] tracking-[0.15em] text-white/40">
          <span>PENDING <span className="text-amber-400">{counts.PENDING}</span></span>
          <span>APPROVED <span className="text-up">{counts.APPROVED}</span></span>
          <span>REJECTED <span className="text-down">{counts.REJECTED}</span></span>
          <span>TOTAL <span className="text-white/70">{rows.length}</span></span>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="h-9 px-4 text-[9px] tracking-[0.15em] font-semibold bg-white text-black hover:bg-white/80 transition-colors flex items-center gap-1.5"
        >
          {showForm ? <><X size={12} /> CLOSE</> : <><Plus size={12} /> NEW MESSAGE</>}
        </button>
      </div>

      {showForm && <SubmitForm onClose={() => setShowForm(false)} tickers={allowedTickers} />}

      {loading && (
        <p className="text-[11px] text-white/25 animate-pulse tracking-[0.1em] py-6">LOADING YOUR MESSAGES...</p>
      )}

      {missingHash && (
        <div className="border border-amber-400/30 bg-amber-400/5 text-amber-400 px-4 py-4 mb-6">
          <p className="text-[11px] tracking-[0.1em] mb-1">SESSION REFRESH NEEDED</p>
          <p className="text-[10px] text-white/50">
            Your session is missing a required field. Log out and log back in to continue.
          </p>
        </div>
      )}

      {!loading && !missingHash && sorted.length === 0 && (
        <div className="text-center py-20 border border-white/8">
          <p className="text-[11px] tracking-[0.1em] text-white/25">You haven&apos;t submitted any news yet.</p>
          <p className="text-[10px] text-white/20 mt-2">Click NEW MESSAGE to submit your first article.</p>
        </div>
      )}

      {!loading && !missingHash && pageRows.length > 0 && (
        <>
          <div className="space-y-3">
            {pageRows.map((r) => (
              <NewsCard key={r.id} row={r} showAuthor={false} showActions={false} tokenHash={tokenHash} />
            ))}
          </div>
          <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} total={sorted.length} />
        </>
      )}
    </div>
  );
}

// ── Admin view ───────────────────────────────────────────────────────────
function AdminView({ tokenHash }: { tokenHash: string | null }) {
  const [tab, setTab] = useState<"ALL" | Status>("PENDING");
  const [page, setPage] = useState(1);

  // Reactive subscription to ALL news items across sources/statuses.
  const raw = useQuery(api.news.listAllNews, { limit: 300 });
  const loading = raw === undefined;

  // Admin UI only cares about human submissions (COMPANY / ADMIN source).
  // LLM_MACRO items are machine-generated and don't go through approval.
  const rows: Row[] = useMemo(() => {
    if (!raw) return [];
    return raw
      .filter((n) => n.source === "COMPANY" || n.source === "ADMIN")
      .map((n) => ({
        id: n.id,
        headline: n.headline,
        body: n.body,
        relatedTickers: n.relatedTickers,
        status: normaliseStatus(n.status),
        authorName: n.authorName,
        authorEmail: n.authorEmail,
        publishedAt: n.publishedAt,
        reviewedAt: n.reviewedAt,
      }));
  }, [raw]);

  const counts = useMemo(
    () => ({
      PENDING: rows.filter((r) => r.status === "PENDING").length,
      APPROVED: rows.filter((r) => r.status === "APPROVED").length,
      REJECTED: rows.filter((r) => r.status === "REJECTED").length,
    }),
    [rows],
  );

  const filtered = useMemo(
    () => (tab === "ALL" ? sortForDisplay(rows) : sortForDisplay(rows.filter((r) => r.status === tab))),
    [rows, tab],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div>
      {/* Tab row */}
      <div className="flex items-center gap-0 border-b border-white/8 mb-6 overflow-x-auto scrollbar-hide">
        {(
          [
            { key: "PENDING" as const, label: "PENDING", count: counts.PENDING, color: "text-amber-400" },
            { key: "APPROVED" as const, label: "APPROVED", count: counts.APPROVED, color: "text-up" },
            { key: "REJECTED" as const, label: "REJECTED", count: counts.REJECTED, color: "text-down" },
            { key: "ALL" as const, label: "ALL", count: rows.length, color: "text-white/70" },
          ]
        ).map(({ key, label, count, color }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setPage(1); }}
            className={`text-[10px] tracking-[0.15em] px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              tab === key
                ? "border-white text-white"
                : "border-transparent text-white/30 hover:text-white/60"
            }`}
          >
            {label} <span className={tab === key ? color : "text-white/40"}>{count}</span>
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-[11px] text-white/25 animate-pulse tracking-[0.1em] py-6">LOADING...</p>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 border border-white/8">
          <p className="text-[11px] tracking-[0.1em] text-white/25">
            {tab === "PENDING"
              ? "No pending news. You're all caught up."
              : `No ${tab.toLowerCase()} news yet.`}
          </p>
        </div>
      )}

      {!loading && pageRows.length > 0 && (
        <>
          <div className="space-y-3">
            {pageRows.map((r) => (
              <NewsCard key={r.id} row={r} showAuthor showActions tokenHash={tokenHash} />
            ))}
          </div>
          <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} total={filtered.length} />
        </>
      )}
    </div>
  );
}

// ── Submit form ──────────────────────────────────────────────────────────
function SubmitForm({
  onClose,
  tickers,
}: {
  onClose: () => void;
  tickers: string[];
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ticker, setTicker] = useState(tickers[0] ?? "");

  // If the allowed ticker list arrives after first render (auth still resolving),
  // hydrate the default selection.
  useEffect(() => {
    if (!ticker && tickers.length > 0) setTicker(tickers[0]);
  }, [tickers, ticker]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) {
      setError("Title and body are required.");
      return;
    }
    const token = authToken();
    if (!token) {
      setError("Not logged in. Refresh and try again.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/company/news", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          headline: t,
          body: b,
          relatedTickers: [ticker],
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? `Submission failed (${res.status}).`);
        return;
      }
      // Success — reactive query will refresh automatically.
      setTitle("");
      setBody("");
      onClose();
    } catch (err) {
      console.error("submit failed", err);
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      onSubmit={handleSubmit}
      className="border border-white/15 p-5 mb-6 space-y-4"
    >
      <div>
        <label className="text-[9px] tracking-[0.2em] text-white/30 uppercase mb-2 block">RELATED TICKER</label>
        <select
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          className="w-full h-10 bg-transparent border border-white/20 px-4 text-[13px] text-white outline-none focus:border-white transition-colors appearance-none cursor-pointer"
        >
          {tickers.map((t) => (
            <option key={t} value={t} className="bg-black text-white">{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[9px] tracking-[0.2em] text-white/30 uppercase mb-2 block">TITLE</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Headline for your news article"
          maxLength={160}
          className="w-full h-10 bg-transparent border border-white/20 px-4 text-[13px] text-white placeholder:text-white/15 outline-none focus:border-white transition-colors"
        />
        <p className="text-[9px] text-white/20 mt-1">{title.length} / 160</p>
      </div>
      <div>
        <label className="text-[9px] tracking-[0.2em] text-white/30 uppercase mb-2 block">BODY</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your article content..."
          rows={5}
          maxLength={2000}
          className="w-full bg-transparent border border-white/20 px-4 py-3 text-[12px] text-white/70 placeholder:text-white/15 outline-none focus:border-white transition-colors resize-none"
        />
        <p className="text-[9px] text-white/20 mt-1">{body.length} / 2000</p>
      </div>
      {error && (
        <div className="border border-down/30 bg-down/5 text-down px-3 py-2 text-[11px]">{error}</div>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="h-9 px-5 text-[9px] tracking-[0.15em] font-semibold bg-white text-black hover:bg-white/80 transition-colors disabled:opacity-50"
        >
          {submitting ? "SUBMITTING..." : "SUBMIT FOR APPROVAL"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-5 text-[9px] tracking-[0.15em] text-white/40 border border-white/15 hover:text-white transition-colors"
        >
          CANCEL
        </button>
      </div>
    </motion.form>
  );
}

// ── News card ────────────────────────────────────────────────────────────
function NewsCard({
  row, showAuthor, showActions, tokenHash,
}: {
  row: Row;
  showAuthor: boolean;
  showActions: boolean;
  tokenHash: string | null;
}) {
  const [actionLoading, setActionLoading] = useState<"approve" | "reject" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function performAction(kind: "approve" | "reject") {
    setActionLoading(kind);
    setActionError(null);
    const token = authToken();
    try {
      const res = await fetch(`/api/admin/news/${row.id}/${kind}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        setActionError(`Action failed (${res.status}).`);
      }
    } catch (err) {
      console.error(`${kind} failed`, err);
      setActionError("Network error.");
    } finally {
      setActionLoading(null);
    }
    // Intentionally silent on success — the reactive useQuery upstream will
    // re-render the card with its new status within ~100ms. No local setState.
    // (Avoids "tokenHash unused" lint warning from an earlier iteration.)
    void tokenHash;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-white/10 p-5 hover:bg-white/[0.02] transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <StatusBadge status={row.status} />
            {row.relatedTickers.map((t) => (
              <span key={t} className="text-[8px] tracking-[0.1em] text-white/30 border border-white/10 px-1.5 py-0.5">{t}</span>
            ))}
          </div>
          <h3 className="text-[13px] text-white/80 font-medium mb-1">{row.headline}</h3>
          <p className="text-[11px] text-white/40 leading-relaxed whitespace-pre-line">{row.body}</p>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {showAuthor && row.authorName && (
              <span className="flex items-center gap-1 text-[9px] text-white/30">
                <User size={9} /> {row.authorName}
              </span>
            )}
            <span className="text-[9px] text-white/20">
              SUBMITTED {new Date(row.publishedAt).toLocaleString("en-IN", {
                day: "2-digit", month: "short",
                hour: "2-digit", minute: "2-digit",
              })}
            </span>
            {row.reviewedAt && (
              <span className="text-[9px] text-white/20">
                · REVIEWED {new Date(row.reviewedAt).toLocaleString("en-IN", {
                  day: "2-digit", month: "short",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
        {showActions && row.status === "PENDING" && (
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => performAction("approve")}
              disabled={actionLoading !== null}
              className="h-8 px-3 text-[9px] tracking-[0.1em] bg-up text-black font-semibold hover:bg-up/80 transition-colors disabled:opacity-50"
            >
              {actionLoading === "approve" ? "..." : "APPROVE"}
            </button>
            <button
              onClick={() => performAction("reject")}
              disabled={actionLoading !== null}
              className="h-8 px-3 text-[9px] tracking-[0.1em] border border-down/40 text-down hover:bg-down/10 transition-colors disabled:opacity-50"
            >
              {actionLoading === "reject" ? "..." : "REJECT"}
            </button>
          </div>
        )}
      </div>
      {actionError && (
        <p className="text-[10px] text-down mt-2">{actionError}</p>
      )}
    </motion.div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Status }) {
  if (status === "PENDING") {
    return (
      <span className="text-[8px] tracking-[0.15em] text-amber-400 border border-amber-400/30 bg-amber-400/5 px-1.5 py-0.5 inline-flex items-center gap-1">
        <Clock size={8} />PENDING
      </span>
    );
  }
  if (status === "APPROVED") {
    return (
      <span className="text-[8px] tracking-[0.15em] text-up border border-up/30 bg-up/5 px-1.5 py-0.5 inline-flex items-center gap-1">
        <CheckCircle size={8} />APPROVED
      </span>
    );
  }
  return (
    <span className="text-[8px] tracking-[0.15em] text-down border border-down/30 bg-down/5 px-1.5 py-0.5 inline-flex items-center gap-1">
      <XCircle size={8} />REJECTED
    </span>
  );
}

// ── Pagination ───────────────────────────────────────────────────────────
function Pagination({
  page, totalPages, onPageChange, total,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  total: number;
}) {
  if (total <= PAGE_SIZE) return null;

  return (
    <div className="flex items-center justify-between mt-6 border-t border-white/6 pt-4">
      <span className="text-[10px] tracking-[0.15em] text-white/30">
        PAGE {page} / {totalPages} · {total} ITEM{total === 1 ? "" : "S"}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="h-8 w-8 flex items-center justify-center border border-white/15 text-white/50 hover:text-white hover:border-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeft size={13} />
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="h-8 w-8 flex items-center justify-center border border-white/15 text-white/50 hover:text-white hover:border-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────
function normaliseStatus(s: string | null | undefined): Status {
  if (s === "PENDING" || s === "APPROVED" || s === "REJECTED") return s;
  return "APPROVED"; // Legacy rows without status are treated as approved (LLM items).
}
