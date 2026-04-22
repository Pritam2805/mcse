/**
 * Centralized API client for MCSE
 *
 * All API calls go through this module. Provides:
 * - Typed fetch wrappers with error handling
 * - Mock data fallback for development
 * - Auth header injection (when Clerk is integrated)
 * - Request/response logging in dev mode
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const USE_MOCK = !API_BASE; // Fall back to mock when no API URL configured

// ─── Token Injection ────────────────────────────────────────────────────────────
// Call registerTokenGetter once on app boot (e.g. in AuthContext) to wire
// Clerk's getToken() into every API request automatically.

let _tokenGetter: (() => Promise<string | null>) | null = null;
export function registerTokenGetter(fn: () => Promise<string | null>): void {
  _tokenGetter = fn;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface MarketStatus {
  isOpen: boolean;
  phase: string;
  dayNumber: number;
  dayTickCounter: number;
  ticksPerDay: number;
  lastUpdated: string;
}

export interface SessionConfig {
  ticksPerDay: number;
  macroTickSeconds: number;
  microTickSeconds: number;
  circuitBreakerPctMicro: number;
  circuitBreakerPctMacro: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  priority: "LOW" | "NORMAL" | "HIGH";
}

export interface MarketEvent {
  eventId: string;
  eventType: "SHOCK" | "REGULATION" | "BOOM" | "SCANDAL" | "RATE_CHANGE" | "NATURAL_DISASTER" | "TECH_BREAKTHROUGH" | "GEOPOLITICAL";
  title: string;
  description: string;
  affectedTickers: string[];
  magnitude: number;
  isActive: boolean;
  injectedAt: string;
  expiresAt: string | null;
}

export interface MarketBreadth {
  advances: number;
  declines: number;
  unchanged: number;
}

export interface IntradayPosition {
  ticker: string;
  name: string;
  qty: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  entryTime: string;
}

export interface CompanyRegistration {
  id: string;
  companyName: string;
  ticker: string;
  sector: string;
  description: string;
  initialShares?: number;
  ipoPrice?: number;
  contactName?: string;
  contactEmail?: string;
  parentCompany?: string;
  requesterEmail?: string;
  submittedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

export interface CompanyGameState {
  subsidiaries: {
    ticker: string;
    name: string;
    revenue: number;
    expenses: number;
    profit: number;
    rdInvestment: number;
    marketingSpend: number;
    productionCapacity: number;
    employeeCount: number;
    productQuality: number;
    customerSatisfaction: number;
    innovationPipeline: number;
    brandStrength: number;
    cash: number;
    debt: number;
    assets: number;
    liabilities: number;
  }[];
}

export interface CredibilityData {
  currentScore: number;
  history: { tick: number; score: number }[];
  recentEvents: { type: string; impact: number; timestamp: string }[];
}

export interface PortfolioAnalysis {
  xirr: number;
  totalReturnPct: number;
  sectorAllocation: { sector: string; percentage: number; value: number }[];
  topGainers: { ticker: string; returnPct: number }[];
  topLosers: { ticker: string; returnPct: number }[];
  riskScore: number;
  benchmarkReturn: number;
  alpha: number;
}

export interface Shareholder {
  name: string;
  archetypeKind: "INSTITUTIONAL" | "SOVEREIGN" | "RETAIL_AGGREGATE" | "INSIDER" | "POOL_PROXY" | "HUMAN";
  shareCount: number;
  percentage: number;
}

export interface Notification {
  notificationId: string;
  kind: "ORDER_FILLED" | "ORDER_PARTIAL" | "ORDER_CANCELLED" | "IPO_ALLOTMENT" | "IPO_REFUND" | "PRICE_ALERT" | "NEWS_ALERT" | "CORPORATE_EVENT" | "MARKET_EVENT" | "DAY_END" | "DAY_START" | "CIRCUIT_BREAKER" | "SYSTEM";
  title: string;
  body: string;
  relatedTicker: string | null;
  relatedEntityId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface PlatformMetrics {
  // Overview
  totalInvestors: number;
  totalCompanies: number;
  totalTrades: number;
  totalVolume: number;
  marketCap: number;
  activeToday: number;
  // Phase 15 live system metrics
  connectedWsUsers: number;
  orderRatePerMin: number;
  llmLatencyP50: number;
  llmLatencyP99: number;
  redisHitRate: number;
  macroTickDurationSecs: number | null;
}

export interface LedgerEntry {
  id: string;
  timestamp: string;
  type: "BUY" | "SELL" | "IPO_ALLOT" | "IPO_REFUND" | "BALANCE_ADJUST" | "INTRADAY_SQUAREOFF";
  ticker: string;
  qty: number;
  price: number;
  buyerId: string | null;
  sellerId: string | null;
  buyerName: string | null;
  sellerName: string | null;
}

export interface Investor {
  investorId: string;
  email: string;
  name: string;
  balance: number;
  kycStatus: "PENDING" | "VERIFIED" | "REJECTED";
  joinedAt: string;
  isSuspended: boolean;
  totalTrades: number;
  portfolioValue: number;
}

export interface StockListItem {
  ticker: string;
  name: string;
  sector: string;
  parent: { ticker: string; name: string };
  price: number | null;
}

export interface StockDetail extends StockListItem {
  ohlcv: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    macro_tick: number;
  } | null;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const mockMarketStatus: MarketStatus = {
  isOpen: true,
  phase: "RUNNING",
  dayNumber: 1,
  dayTickCounter: 5,
  ticksPerDay: 18,
  lastUpdated: new Date().toISOString(),
};

const mockSessionConfig: SessionConfig = {
  ticksPerDay: 18,
  macroTickSeconds: 1200,
  microTickSeconds: 5,
  circuitBreakerPctMicro: 3,
  circuitBreakerPctMacro: 10,
};

const mockAnnouncements: Announcement[] = [
  { id: "ANN-1", title: "Welcome to MCSE Exchange", content: "The mock stock exchange is now live for all members.", timestamp: Date.now() - 86400000 * 3, priority: "NORMAL" },
  { id: "ANN-2", title: "Trading hours updated", content: "Market is now open 9 AM - 3:30 PM on weekdays.", timestamp: Date.now() - 86400000, priority: "HIGH" },
];

const mockMarketBreadth: MarketBreadth = {
  advances: 12,
  declines: 6,
  unchanged: 3,
};

const mockIntradayPositions: IntradayPosition[] = [
  { ticker: "ECLOUD", name: "Enigma Cloud", qty: 5, entryPrice: 3200.00, currentPrice: 3215.40, unrealizedPnl: 77.00, unrealizedPnlPercent: 0.48, entryTime: new Date(Date.now() - 3600000).toISOString() },
  { ticker: "MACAD", name: "MathSoc Academy", qty: 10, entryPrice: 1190.00, currentPrice: 1198.50, unrealizedPnl: 85.00, unrealizedPnlPercent: 0.71, entryTime: new Date(Date.now() - 7200000).toISOString() },
];

const mockCompanyRegistrations: CompanyRegistration[] = [
  { id: "REG-001", companyName: "Quantum Labs", ticker: "QLAB", sector: "Technology", description: "Quantum computing research and development for scientific computing applications. We aim to provide accessible quantum computing resources to students and researchers.", initialShares: 50000, ipoPrice: 150, contactName: "Ravi Sharma", contactEmail: "founder@quantumlabs.com", submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(), status: "PENDING" },
  { id: "REG-002", companyName: "Green Energy Co", ticker: "GREEN", sector: "Energy", description: "Renewable energy solutions focusing on solar and wind power for campus buildings. Our goal is to make sustainable energy accessible to all.", initialShares: 25000, ipoPrice: 200, contactName: "Priya Patel", contactEmail: "ceo@greenenergy.com", submittedAt: new Date(Date.now() - 86400000).toISOString(), status: "PENDING" },
  { id: "REG-003", companyName: "HealthTech Solutions", ticker: "HLTH", sector: "Healthcare", description: "Digital health platform for student wellness tracking and mental health support services.", initialShares: 30000, ipoPrice: 100, contactName: "Anjali Gupta", contactEmail: "hello@healthtech.in", submittedAt: new Date(Date.now() - 86400000 * 5).toISOString(), status: "APPROVED" },
];

const mockGameState: CompanyGameState = {
  subsidiaries: [
    { ticker: "ESOFT", name: "Enigma Software", revenue: 45000000, expenses: 32000000, profit: 13000000, rdInvestment: 5000000, marketingSpend: 3000000, productionCapacity: 1000, employeeCount: 850, productQuality: 72, customerSatisfaction: 68, innovationPipeline: 45, brandStrength: 61, cash: 8000000, debt: 12000000, assets: 31000000, liabilities: 18000000 },
    { ticker: "ECLOUD", name: "Enigma Cloud", revenue: 38000000, expenses: 28000000, profit: 10000000, rdInvestment: 4000000, marketingSpend: 2500000, productionCapacity: 800, employeeCount: 620, productQuality: 78, customerSatisfaction: 74, innovationPipeline: 52, brandStrength: 65, cash: 6000000, debt: 8000000, assets: 25000000, liabilities: 14000000 },
    { ticker: "ENAI", name: "Enigma AI", revenue: 52000000, expenses: 35000000, profit: 17000000, rdInvestment: 8000000, marketingSpend: 4000000, productionCapacity: 500, employeeCount: 420, productQuality: 85, customerSatisfaction: 82, innovationPipeline: 78, brandStrength: 72, cash: 12000000, debt: 5000000, assets: 42000000, liabilities: 12000000 },
  ],
};

const mockCredibility: CredibilityData = {
  currentScore: 68.5,
  history: [
    { tick: 1, score: 70 },
    { tick: 2, score: 72 },
    { tick: 3, score: 69 },
    { tick: 4, score: 68 },
    { tick: 5, score: 68.5 },
  ],
  recentEvents: [
    { type: "EARNINGS_MISS", impact: -2, timestamp: new Date(Date.now() - 86400000).toISOString() },
    { type: "PRODUCT_LAUNCH", impact: +1.5, timestamp: new Date(Date.now() - 43200000).toISOString() },
  ],
};

const mockPortfolioAnalysis: PortfolioAnalysis = {
  xirr: 18.4,
  totalReturnPct: 15.71,
  sectorAllocation: [
    { sector: "Technology", percentage: 42, value: 204830 },
    { sector: "Education", percentage: 28, value: 136554 },
    { sector: "Automotive", percentage: 18, value: 87785 },
    { sector: "Media", percentage: 12, value: 58523 },
  ],
  topGainers: [
    { ticker: "MACAD", returnPct: 22.3 },
    { ticker: "GMAUTO", returnPct: 18.2 },
    { ticker: "ECLOUD", returnPct: 15.6 },
  ],
  topLosers: [
    { ticker: "ERPRESS", returnPct: -4.2 },
    { ticker: "INCON", returnPct: -1.8 },
  ],
  riskScore: 6.2,
  benchmarkReturn: 12.8,
  alpha: 5.6,
};

const mockShareholders: Shareholder[] = [
  { name: "Enigma Group (Promoter)", archetypeKind: "INSIDER", shareCount: 3500000, percentage: 35 },
  { name: "Aegis Capital", archetypeKind: "INSTITUTIONAL", shareCount: 1200000, percentage: 12 },
  { name: "AEON Pension Fund", archetypeKind: "INSTITUTIONAL", shareCount: 800000, percentage: 8 },
  { name: "Veritas Sovereign Wealth", archetypeKind: "SOVEREIGN", shareCount: 600000, percentage: 6 },
  { name: "Public Float Holdings", archetypeKind: "RETAIL_AGGREGATE", shareCount: 2400000, percentage: 24 },
  { name: "Background Liquidity Pool", archetypeKind: "POOL_PROXY", shareCount: 1500000, percentage: 15 },
];

const mockNotifications: Notification[] = [
  { notificationId: "NOT-001", kind: "ORDER_FILLED", title: "Order Filled", body: "Your buy order for 5 ECLOUD has been filled at ₹3,215.40", relatedTicker: "ECLOUD", relatedEntityId: "ORD-123", isRead: false, createdAt: new Date(Date.now() - 120000).toISOString() },
  { notificationId: "NOT-002", kind: "PRICE_ALERT", title: "Price Alert", body: "MACAD has crossed your alert price of ₹1,200", relatedTicker: "MACAD", relatedEntityId: null, isRead: false, createdAt: new Date(Date.now() - 300000).toISOString() },
  { notificationId: "NOT-003", kind: "MARKET_EVENT", title: "Market Event", body: "Tech sector boom announced - IT stocks rallying", relatedTicker: null, relatedEntityId: "EVT-456", isRead: true, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { notificationId: "NOT-004", kind: "DAY_START", title: "Market Open", body: "Day 1 trading session has begun", relatedTicker: null, relatedEntityId: null, isRead: true, createdAt: new Date(Date.now() - 7200000).toISOString() },
];

const mockPlatformMetrics: PlatformMetrics = {
  totalInvestors: 248,
  totalCompanies: 7,
  totalTrades: 1842,
  totalVolume: 2487693,
  marketCap: 156000000,
  activeToday: 67,
  connectedWsUsers: 0,
  orderRatePerMin: 0,
  llmLatencyP50: 0,
  llmLatencyP99: 0,
  redisHitRate: 0,
  macroTickDurationSecs: null,
};

const mockLedgerEntries: LedgerEntry[] = [
  { id: "LED-001", timestamp: new Date(Date.now() - 120000).toISOString(), type: "BUY", ticker: "MACAD", qty: 10, price: 1198.50, buyerId: "USR-001", sellerId: "POOL", buyerName: "Arun Kumar", sellerName: "Liquidity Pool" },
  { id: "LED-002", timestamp: new Date(Date.now() - 480000).toISOString(), type: "SELL", ticker: "ECLOUD", qty: 5, price: 3215.40, buyerId: "POOL", sellerId: "USR-002", buyerName: "Liquidity Pool", sellerName: "Priya Sharma" },
  { id: "LED-003", timestamp: new Date(Date.now() - 900000).toISOString(), type: "BUY", ticker: "CELBIO", qty: 20, price: 2148.00, buyerId: "USR-003", sellerId: "USR-004", buyerName: "Rahul Verma", sellerName: "Meena Reddy" },
  { id: "LED-004", timestamp: new Date(Date.now() - 2700000).toISOString(), type: "INTRADAY_SQUAREOFF", ticker: "GMAUTO", qty: 15, price: 1456.20, buyerId: "POOL", sellerId: "USR-001", buyerName: "Liquidity Pool", sellerName: "Arun Kumar" },
];

const mockInvestors: Investor[] = [
  { investorId: "USR-001", email: "arun@mcse.in", name: "Arun Kumar", balance: 12450, kycStatus: "VERIFIED", joinedAt: "2025-01-15", isSuspended: false, totalTrades: 34, portfolioValue: 87500 },
  { investorId: "USR-002", email: "priya@mcse.in", name: "Priya Sharma", balance: 8920, kycStatus: "VERIFIED", joinedAt: "2025-01-18", isSuspended: false, totalTrades: 21, portfolioValue: 62300 },
  { investorId: "USR-003", email: "rahul@mcse.in", name: "Rahul Verma", balance: 45300, kycStatus: "PENDING", joinedAt: "2025-01-10", isSuspended: false, totalTrades: 15, portfolioValue: 125000 },
  { investorId: "USR-004", email: "meena@mcse.in", name: "Meena Reddy", balance: 23100, kycStatus: "VERIFIED", joinedAt: "2025-01-12", isSuspended: false, totalTrades: 42, portfolioValue: 98700 },
  { investorId: "USR-005", email: "vikash@mcse.in", name: "Vikash Patel", balance: 5200, kycStatus: "REJECTED", joinedAt: "2025-01-20", isSuspended: true, totalTrades: 8, portfolioValue: 15600 },
];

// ─── Core Fetch Wrapper ────────────────────────────────────────────────────────

async function apiFetch<T, Raw = T>(
  endpoint: string,
  options: RequestInit = {},
  mockData?: T,
  transform?: (data: Raw) => T
): Promise<ApiResponse<T>> {
  if (USE_MOCK && mockData !== undefined) {
    await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
    return { data: mockData, error: null, status: 200 };
  }

  try {
    const token = _tokenGetter ? await _tokenGetter() : null;
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const errorBody = await res.text();
      return { data: null, error: errorBody || res.statusText, status: res.status };
    }

    const raw = await res.json();
    const data: T = transform ? transform(raw as Raw) : raw;
    return { data, error: null, status: res.status };
  } catch (err) {
    return { data: null, error: (err as Error).message, status: 0 };
  }
}

// ─── API Methods ───────────────────────────────────────────────────────────────

// === Market Status & Admin ===

export async function getMarketStatus(): Promise<ApiResponse<MarketStatus>> {
  return apiFetch<MarketStatus, Record<string, unknown>>(
    "/admin/market/status",
    {},
    mockMarketStatus,
    (raw) => ({
      isOpen: Boolean(raw.is_open),
      phase: String(raw.phase ?? "IDLE"),
      dayNumber: Number(raw.day_number ?? 0),
      dayTickCounter: Number(raw.day_tick_counter ?? 0),
      ticksPerDay: Number(raw.ticks_per_day ?? 18),
      lastUpdated: new Date().toISOString(),
    })
  );
}

// currentPhase: the phase value from the last getMarketStatus() call
// IDLE → start, RUNNING → pause, PAUSED|DAY_ENDED → resume
export async function toggleMarketStatus(currentPhase: string): Promise<ApiResponse<{ ok: boolean }>> {
  let endpoint: string;
  if (currentPhase === "IDLE") endpoint = "/admin/market/start";
  else if (currentPhase === "RUNNING") endpoint = "/admin/market/pause";
  else if (currentPhase === "PAUSED" || currentPhase === "DAY_ENDED") endpoint = "/admin/market/resume";
  else return { data: null, error: `Cannot toggle market from phase: ${currentPhase}`, status: 409 };

  return apiFetch(endpoint, { method: "POST" }, { ok: true });
}

export type MarketDay = { dayNumber: number; dayTickCounter: number; ticksPerDay: number };

export async function getMarketDay(): Promise<ApiResponse<MarketDay>> {
  return apiFetch<MarketDay, Record<string, unknown>>(
    "/admin/market/day",
    {},
    { dayNumber: mockMarketStatus.dayNumber, dayTickCounter: mockMarketStatus.dayTickCounter, ticksPerDay: mockMarketStatus.ticksPerDay },
    (raw) => ({
      dayNumber: Number(raw.day_number ?? 0),
      dayTickCounter: Number(raw.day_tick_counter ?? 0),
      ticksPerDay: Number(raw.ticks_per_day ?? 18),
    })
  );
}

const normalizeSessionConfig = (raw: Record<string, unknown>): SessionConfig => ({
  ticksPerDay: Number(raw.ticks_per_day ?? 18),
  macroTickSeconds: Number(raw.macro_tick_interval_secs ?? 1200),
  microTickSeconds: Number(raw.micro_tick_interval_secs ?? 5),
  circuitBreakerPctMicro: Number(raw.circuit_breaker_micro_pct ?? 3),
  circuitBreakerPctMacro: Number(raw.circuit_breaker_macro_pct ?? 10),
});

export async function getSessionConfig(): Promise<ApiResponse<SessionConfig>> {
  return apiFetch<SessionConfig, Record<string, unknown>>(
    "/admin/session/config", {}, mockSessionConfig, normalizeSessionConfig
  );
}

export async function updateSessionConfig(config: Partial<SessionConfig>): Promise<ApiResponse<SessionConfig>> {
  // Map camelCase frontend keys to snake_case DB column names
  const body: Record<string, unknown> = {};
  if (config.ticksPerDay !== undefined) body.ticks_per_day = config.ticksPerDay;
  if (config.macroTickSeconds !== undefined) body.macro_tick_interval_secs = config.macroTickSeconds;
  if (config.microTickSeconds !== undefined) body.micro_tick_interval_secs = config.microTickSeconds;
  if (config.circuitBreakerPctMicro !== undefined) body.circuit_breaker_micro_pct = config.circuitBreakerPctMicro;
  if (config.circuitBreakerPctMacro !== undefined) body.circuit_breaker_macro_pct = config.circuitBreakerPctMacro;

  return apiFetch<SessionConfig, Record<string, unknown>>(
    "/admin/session/config",
    { method: "PUT", body: JSON.stringify(body) },
    { ...mockSessionConfig, ...config },
    normalizeSessionConfig
  );
}

// === Announcements ===

type RawAnnouncement = { id: string; title: string; content: string; is_pinned: boolean; published_at: string };
const normalizeAnnouncement = (raw: RawAnnouncement): Announcement => ({
  id: String(raw.id),
  title: raw.title,
  content: raw.content,
  timestamp: new Date(raw.published_at).getTime(),
  priority: raw.is_pinned ? "HIGH" : "NORMAL",
});

export async function getAnnouncements(): Promise<ApiResponse<Announcement[]>> {
  return apiFetch<Announcement[], RawAnnouncement[]>(
    "/market/announcements", {}, mockAnnouncements,
    (rows) => rows.map(normalizeAnnouncement)
  );
}

export async function createAnnouncement(announcement: Omit<Announcement, "id" | "timestamp">): Promise<ApiResponse<Announcement>> {
  const newAnn: Announcement = { id: `ANN-${Date.now()}`, ...announcement, timestamp: Date.now() };
  const body = {
    title: announcement.title,
    content: announcement.content,
    is_pinned: announcement.priority === "HIGH",
  };
  return apiFetch<Announcement, RawAnnouncement>(
    "/admin/announcements",
    { method: "POST", body: JSON.stringify(body) },
    newAnn,
    normalizeAnnouncement
  );
}

// === Market Events ===

export async function getMarketEvents(): Promise<ApiResponse<MarketEvent[]>> {
  return apiFetch("/admin/events", {}, []);
}

export async function injectMarketEvent(event: Omit<MarketEvent, "eventId" | "injectedAt" | "isActive">): Promise<ApiResponse<MarketEvent>> {
  const newEvent: MarketEvent = {
    eventId: `EVT-${Date.now()}`,
    ...event,
    isActive: true,
    injectedAt: new Date().toISOString(),
  };
  return apiFetch(
    "/admin/events",
    { method: "POST", body: JSON.stringify(event) },
    newEvent
  );
}

// === Market Breadth ===

export async function getMarketBreadth(): Promise<ApiResponse<MarketBreadth>> {
  return apiFetch("/market/breadth", {}, mockMarketBreadth);
}

// === Intraday Positions ===

export async function getIntradayPositions(): Promise<ApiResponse<IntradayPosition[]>> {
  return apiFetch("/investor/positions?type=INTRADAY", {}, mockIntradayPositions);
}

// === Company Registrations ===

export async function getCompanyRegistrations(): Promise<ApiResponse<CompanyRegistration[]>> {
  return apiFetch("/admin/companies/registrations", {}, mockCompanyRegistrations);
}

// Alias for registration queue
export const getRegistrationQueue = getCompanyRegistrations;

export async function submitCompanyRegistration(data: {
  companyName: string;
  ticker: string;
  sector: string;
  description: string;
}): Promise<ApiResponse<CompanyRegistration>> {
  const newReg: CompanyRegistration = {
    id: `REG-${Date.now()}`,
    ...data,
    requesterEmail: "user@mcse.in",
    submittedAt: new Date().toISOString(),
    status: "PENDING",
  };
  return apiFetch(
    "/company/register",
    { method: "POST", body: JSON.stringify(data) },
    newReg
  );
}

// Extended registration function with all fields
export async function submitRegistration(data: {
  companyName: string;
  ticker: string;
  sector: string;
  description: string;
  initialShares: number;
  ipoPrice: number;
  contactName: string;
  contactEmail: string;
  parentCompany?: string;
}): Promise<ApiResponse<CompanyRegistration>> {
  const newReg: CompanyRegistration = {
    id: `REG-${Date.now()}`,
    companyName: data.companyName,
    ticker: data.ticker,
    sector: data.sector,
    description: data.description,
    initialShares: data.initialShares,
    ipoPrice: data.ipoPrice,
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    parentCompany: data.parentCompany,
    submittedAt: new Date().toISOString(),
    status: "PENDING",
  };
  return apiFetch(
    "/company/register",
    { method: "POST", body: JSON.stringify(data) },
    newReg
  );
}

export async function approveRegistration(id: string): Promise<ApiResponse<{ success: boolean }>> {
  return apiFetch(
    `/admin/companies/registrations/${id}/approve`,
    { method: "POST" },
    { success: true }
  );
}

export async function rejectRegistration(id: string, reason?: string): Promise<ApiResponse<{ success: boolean }>> {
  return apiFetch(
    `/admin/companies/registrations/${id}/reject`,
    { method: "POST", body: JSON.stringify({ reason: reason || "Application rejected" }) },
    { success: true }
  );
}

// === Company Game State ===

export async function getCompanyGameState(): Promise<ApiResponse<CompanyGameState>> {
  return apiFetch("/company/gamestate", {}, mockGameState);
}

// === Credibility ===

export async function getCompanyCredibility(): Promise<ApiResponse<CredibilityData>> {
  return apiFetch("/company/credibility", {}, mockCredibility);
}

// Alias with optional ticker param
export async function getCredibility(ticker?: string): Promise<ApiResponse<CredibilityData>> {
  const endpoint = ticker ? `/company/${ticker}/credibility` : "/company/credibility";
  return apiFetch(endpoint, {}, mockCredibility);
}

// === Event Injection ===

export async function injectEvent(data: {
  ticker: string;
  eventType: string;
  message?: string;
}): Promise<ApiResponse<{ success: boolean }>> {
  return apiFetch(
    `/admin/events/inject`,
    { method: "POST", body: JSON.stringify(data) },
    { success: true }
  );
}

// === Scandal ===

export async function triggerScandal(ticker: string, magnitude: number): Promise<ApiResponse<{ success: boolean }>> {
  return apiFetch(
    `/admin/companies/${ticker}/scandal`,
    { method: "POST", body: JSON.stringify({ magnitude }) },
    { success: true }
  );
}

// === Portfolio ===

export interface PortfolioHolding {
  ticker: string;
  name: string;
  sector: string;
  quantity: number;
  avg_price: number;
  current_price: number | null;
  pnl: number | null;
  updated_at: string;
}

export interface Portfolio {
  balance: number;
  holdings: PortfolioHolding[];
}

export async function getPortfolio(): Promise<ApiResponse<Portfolio>> {
  return apiFetch<Portfolio>("/investor/portfolio", {}, { balance: 0, holdings: [] });
}

// === Portfolio Analysis ===

export async function getPortfolioAnalysis(): Promise<ApiResponse<PortfolioAnalysis>> {
  return apiFetch("/investor/portfolio/analysis", {}, mockPortfolioAnalysis);
}

// === Shareholders ===

export async function getShareholders(ticker: string): Promise<ApiResponse<Shareholder[]>> {
  return apiFetch(`/market/stocks/${ticker}/shareholders`, {}, mockShareholders);
}

// === Notifications ===

export async function getNotifications(): Promise<ApiResponse<Notification[]>> {
  return apiFetch("/investor/notifications", {}, mockNotifications);
}

export async function markNotificationRead(id: string): Promise<ApiResponse<{ success: boolean }>> {
  return apiFetch(
    `/investor/notifications/${id}/read`,
    { method: "PUT" },
    { success: true }
  );
}

export async function markAllNotificationsRead(): Promise<ApiResponse<{ success: boolean }>> {
  return apiFetch(
    "/investor/notifications/read-all",
    { method: "PUT" },
    { success: true }
  );
}

// === Watchlist with Price Alerts ===

export interface WatchlistItem {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  price_alert_above: number | null;
  price_alert_below: number | null;
  alert_above_armed: boolean;
  alert_below_armed: boolean;
  added_at: string;
  current_price: number | null;
}

export async function getWatchlist(): Promise<ApiResponse<WatchlistItem[]>> {
  return apiFetch<WatchlistItem[]>("/investor/watchlist", {}, []);
}

export async function addToWatchlist(ticker: string): Promise<ApiResponse<{ ok: boolean }>> {
  return apiFetch(
    "/investor/watchlist",
    { method: "POST", body: JSON.stringify({ ticker }) },
    { ok: true }
  );
}

export async function removeFromWatchlist(ticker: string): Promise<ApiResponse<{ ok: boolean }>> {
  return apiFetch(
    `/investor/watchlist/${ticker}`,
    { method: "DELETE" },
    { ok: true }
  );
}

export async function updatePriceAlerts(
  ticker: string,
  priceAlertAbove?: number | null,
  priceAlertBelow?: number | null
): Promise<ApiResponse<{ ok: boolean }>> {
  return apiFetch(
    `/investor/watchlist/${ticker}`,
    {
      method: "PUT",
      body: JSON.stringify({ price_alert_above: priceAlertAbove, price_alert_below: priceAlertBelow }),
    },
    { ok: true }
  );
}

// === Admin Metrics ===

export async function getPlatformMetrics(): Promise<ApiResponse<PlatformMetrics>> {
  return apiFetch<PlatformMetrics, Record<string, unknown>>(
    "/admin/metrics",
    {},
    mockPlatformMetrics,
    (raw) => ({
      totalInvestors:        Number(raw.total_investors ?? 0),
      totalCompanies:        Number(raw.total_companies ?? 0),
      totalTrades:           Number(raw.total_trades ?? 0),
      totalVolume:           Number(raw.total_volume ?? 0),
      marketCap:             0,
      activeToday:           Number(raw.active_today ?? 0),
      connectedWsUsers:      Number(raw.connected_ws_users ?? 0),
      orderRatePerMin:       Number(raw.order_rate_per_min ?? 0),
      llmLatencyP50:         Number((raw.llm_latency_p50_p99 as Record<string, number>)?.p50 ?? 0),
      llmLatencyP99:         Number((raw.llm_latency_p50_p99 as Record<string, number>)?.p99 ?? 0),
      redisHitRate:          Number(raw.redis_hit_rate ?? 0),
      macroTickDurationSecs: raw.macro_tick_duration_secs != null ? Number(raw.macro_tick_duration_secs) : null,
    })
  );
}

// === Admin Ledger ===

export async function getLedger(params?: {
  ticker?: string;
  from?: string;
  to?: string;
  type?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{ entries: LedgerEntry[]; total: number; page: number; limit: number }>> {
  const query = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
  return apiFetch<
    { entries: LedgerEntry[]; total: number; page: number; limit: number },
    { rows: Record<string, unknown>[]; total: number; limit: number; offset: number }
  >(
    `/admin/ledger${query}`,
    {},
    { entries: mockLedgerEntries, total: mockLedgerEntries.length, page: 1, limit: 50 },
    (raw) => ({
      entries: (raw.rows ?? []).map((r) => ({
        id:         String(r.id ?? ""),
        timestamp:  String(r.created_at ?? ""),
        type:       String(r.event_type ?? "BUY") as LedgerEntry["type"],
        ticker:     String(r.subsidiary_id ?? ""),
        qty:        Number(r.quantity ?? 0),
        price:      Number(r.price_per_unit ?? 0),
        buyerId:    r.investor_id ? String(r.investor_id) : null,
        sellerId:   null,
        buyerName:  null,
        sellerName: null,
      })),
      total:  Number(raw.total ?? 0),
      page:   Math.floor(Number(raw.offset ?? 0) / Number(raw.limit ?? 100)) + 1,
      limit:  Number(raw.limit ?? 100),
    })
  );
}

// === Admin Investors ===

export async function getInvestors(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{ investors: Investor[]; total: number }>> {
  const query = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
  return apiFetch<
    { investors: Investor[]; total: number },
    { rows: Record<string, unknown>[]; total: number }
  >(
    `/admin/investors${query}`,
    {},
    { investors: mockInvestors, total: mockInvestors.length },
    (raw) => ({
      investors: (raw.rows ?? []).map((r) => ({
        investorId:     String(r.id ?? ""),
        email:          String(r.email ?? ""),
        name:           String(r.email ?? "").split("@")[0],
        balance:        Number(r.balance ?? 0),
        kycStatus:      (r.kyc_status as Investor["kycStatus"]) ?? "PENDING",
        joinedAt:       String(r.created_at ?? ""),
        isSuspended:    false,
        totalTrades:    Number(r.trade_count ?? 0),
        portfolioValue: 0,
      })),
      total: Number(raw.total ?? 0),
    })
  );
}

export async function getInvestorDetails(id: string): Promise<ApiResponse<Investor>> {
  return apiFetch(
    `/admin/investors/${id}`,
    {},
    mockInvestors.find((i) => i.investorId === id) || mockInvestors[0]
  );
}

export async function adjustInvestorBalance(id: string, amount: number, reason: string): Promise<ApiResponse<{ success: boolean; newBalance: number }>> {
  const investor = mockInvestors.find((i) => i.investorId === id);
  return apiFetch(
    `/admin/investors/${id}/balance`,
    { method: "POST", body: JSON.stringify({ amount, reason }) },
    { success: true, newBalance: (investor?.balance || 0) + amount }
  );
}

export async function topupInvestor(id: string, amount: number): Promise<ApiResponse<{ ok: boolean; new_balance: number }>> {
  return apiFetch(
    `/admin/investors/${id}/topup`,
    { method: "POST", body: JSON.stringify({ amount }) },
    { ok: true, new_balance: amount }
  );
}

export async function suspendInvestor(id: string, suspend: boolean): Promise<ApiResponse<{ success: boolean }>> {
  return apiFetch(
    `/admin/investors/${id}/suspend`,
    { method: "POST", body: JSON.stringify({ suspend }) },
    { success: true }
  );
}

// === Market Stocks ===
// In mock mode both functions return empty/null so pages fall back to mockData.

export async function getStocks(): Promise<ApiResponse<StockListItem[]>> {
  return apiFetch<StockListItem[]>("/market/stocks", {}, []);
}

export async function getStock(ticker: string): Promise<ApiResponse<StockDetail | null>> {
  return apiFetch<StockDetail | null>(`/market/stocks/${ticker.toUpperCase()}`, {}, null);
}

// === ETFs ===

export interface ETFListItem {
  ticker: string;
  name: string;
  category: string;
  benchmark_index: string | null;
  expense_ratio_bps: number;
  shares_outstanding: number;
  nav: number;
  price: number;
}

export interface ETFNavPoint {
  macro_tick: number;
  micro_tick: number;
  nav: number;
  market_price: number;
  recorded_at: string;
}

export interface ETFDetail extends ETFListItem {
  nav_history: ETFNavPoint[];
}

export interface ETFHolding {
  ticker: string;
  name: string;
  sector: string;
  weight: number;
  price: number | null;
}

export async function getEtfs(): Promise<ApiResponse<ETFListItem[]>> {
  return apiFetch<ETFListItem[]>("/market/etfs", {}, []);
}

export async function getEtf(ticker: string): Promise<ApiResponse<ETFDetail | null>> {
  return apiFetch<ETFDetail | null>(`/market/etfs/${ticker.toUpperCase()}`, {}, null);
}

export async function getEtfHoldings(ticker: string): Promise<ApiResponse<ETFHolding[]>> {
  return apiFetch<ETFHolding[]>(`/market/etfs/${ticker.toUpperCase()}/holdings`, {}, []);
}

// === News ===

export interface NewsItem {
  id: string;
  headline: string;
  body: string;
  related_tickers: string[];
  sentiment: number;
  source: string;
  macro_tick: number;
  published_at: string | null;
}

export async function getNews(params?: {
  limit?: number;
  offset?: number;
  ticker?: string;
}): Promise<ApiResponse<NewsItem[]>> {
  const q = new URLSearchParams();
  if (params?.limit)  q.set('limit',  String(params.limit));
  if (params?.offset) q.set('offset', String(params.offset));
  if (params?.ticker) q.set('ticker', params.ticker);
  const qs = q.toString() ? `?${q}` : '';
  return apiFetch<NewsItem[]>(`/market/news${qs}`, {}, []);
}

export async function getNewsItem(id: string): Promise<ApiResponse<NewsItem | null>> {
  return apiFetch<NewsItem | null>(`/market/news/${id}`, {}, null);
}

// === Screener ===

export interface ScreenerItem {
  ticker: string;
  name: string;
  sector: string;
  price: number | null;
  change_pct: number | null;
  volume: number | null;
  market_cap: number | null;
  pe_ratio: number | null;
}

export async function getScreener(params?: {
  sector?: string;
  min_price?: number;
  max_price?: number;
  min_change_pct?: number;
  max_change_pct?: number;
  min_pe?: number;
  max_pe?: number;
}): Promise<ApiResponse<ScreenerItem[]>> {
  const q = new URLSearchParams();
  if (params?.sector)         q.set('sector',         params.sector);
  if (params?.min_price)      q.set('min_price',      String(params.min_price));
  if (params?.max_price)      q.set('max_price',      String(params.max_price));
  if (params?.min_change_pct) q.set('min_change_pct', String(params.min_change_pct));
  if (params?.max_change_pct) q.set('max_change_pct', String(params.max_change_pct));
  if (params?.min_pe)         q.set('min_pe',         String(params.min_pe));
  if (params?.max_pe)         q.set('max_pe',         String(params.max_pe));
  const qs = q.toString() ? `?${q}` : '';
  return apiFetch<ScreenerItem[]>(`/market/screener${qs}`, {}, []);
}

// === IPO ===

export interface IpoListing {
  id: string;
  status: "UPCOMING" | "LIVE" | "CLOSED" | "LISTED";
  price_band_low: number;
  price_band_high: number;
  lot_size: number;
  max_lots_per_investor: number;
  open_date: string;
  close_date: string;
  subscription_times: number | null;
  opening_price: number | null;
  ticker: string;
  name: string;
  sector: string;
  total_applicants?: number;
  total_lots_applied?: number;
}

export interface IpoApplication {
  application_id: string;
  ipo_id: string;
  lots_applied: number;
  lots_allotted: number | null;
  amount_blocked: number;
  application_status: string;
  applied_at: string;
  ticker: string;
  name: string;
}

export async function getIpoListings(): Promise<ApiResponse<IpoListing[]>> {
  return apiFetch<IpoListing[]>("/market/ipo", {}, []);
}

export async function getIpoListing(id: string): Promise<ApiResponse<IpoListing | null>> {
  return apiFetch<IpoListing | null>(`/market/ipo/${id}`, {}, null);
}

export async function getMyIpoApplications(): Promise<ApiResponse<IpoApplication[]>> {
  return apiFetch<IpoApplication[]>("/investor/ipo", {}, []);
}

export async function applyForIpo(ipoId: string, lots: number): Promise<ApiResponse<{ ok: boolean; error?: string }>> {
  return apiFetch(
    "/investor/ipo/apply",
    { method: "POST", body: JSON.stringify({ ipo_id: ipoId, lots }) },
    { ok: true }
  );
}

export async function withdrawIpoApplication(ipoId: string): Promise<ApiResponse<{ ok: boolean }>> {
  return apiFetch(
    `/investor/ipo/${ipoId}`,
    { method: "DELETE" },
    { ok: true }
  );
}
