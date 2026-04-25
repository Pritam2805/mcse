// ─── Indian Market Indices ───────────────────────────────
export interface IndexData {
  name: string;
  slug: string;
  value: number;
  change: number;
  changePercent: number;
  sparkline: number[];
  description: string;
  constituents: string[];
  chartData: Record<string, { day: string; price: number }[]>;
}

function generateIndexChart(base: number): Record<string, { day: string; price: number }[]> {
  const rng = (p: number, pct: number) => +(p * (1 + (Math.random() - 0.5) * pct)).toFixed(2);
  const oneH: { day: string; price: number }[] = [];
  for (let m = 0; m < 60; m++) oneH.push({ day: `10:${String(m).padStart(2, "0")}`, price: rng(base, 0.004) });
  oneH[oneH.length - 1].price = base;
  const threeH: { day: string; price: number }[] = [];
  for (let h = 10; h <= 12; h++) for (let m = 0; m < 60; m++) threeH.push({ day: `${h}:${String(m).padStart(2, "0")}`, price: rng(base, 0.008) });
  threeH[threeH.length - 1].price = base;
  const oneD: { day: string; price: number }[] = [];
  for (let h = 10; h <= 17; h++) { oneD.push({ day: `${h}:00`, price: rng(base, 0.012) }); if (h < 17) oneD.push({ day: `${h}:30`, price: rng(base, 0.012) }); }
  oneD.push({ day: "17:30", price: base });
  return {
    "1H": oneH, "3H": threeH, "1D": oneD,
    "3D": [{ day: "APR 24", price: rng(base, 0.02) }, { day: "24 EVE", price: rng(base, 0.015) }, { day: "APR 25", price: rng(base, 0.012) }, { day: "25 EVE", price: rng(base, 0.01) }, { day: "APR 26", price: rng(base, 0.008) }, { day: "26 EVE", price: rng(base, 0.005) }, { day: "CLOSE", price: base }],
    "ALL": [{ day: "APR 24", price: rng(base, 0.03) }, { day: "24 AFT", price: rng(base, 0.025) }, { day: "24 EVE", price: rng(base, 0.02) }, { day: "APR 25", price: rng(base, 0.025) }, { day: "25 AFT", price: rng(base, 0.02) }, { day: "25 EVE", price: rng(base, 0.015) }, { day: "APR 26", price: rng(base, 0.015) }, { day: "26 AFT", price: rng(base, 0.01) }, { day: "26 EVE", price: rng(base, 0.005) }, { day: "CLOSE", price: base }],
  };
}

// ─── Parent Companies (holding companies, not traded) ───
export interface ParentCompany {
  ticker: string;
  name: string;
  about: string;
  subsidiaries: string[];
  totalEmployees: number;
  logoLetter: string;
  founded: string;
}

export const parentCompanies: ParentCompany[] = [
  {
    ticker: "ENIGMA",
    name: "Enigma Group",
    about: "Enigma is the premier computer science and coding club turned tech conglomerate, operating across software, cloud infrastructure, and artificial intelligence.",
    subsidiaries: ["ESOFT", "ECLOUD", "ENAI"],
    totalEmployees: 850 + 520 + 280,
    logoLetter: "E",
    founded: "2017",
  },
  {
    ticker: "ERUDITE",
    name: "Erudite Group",
    about: "Erudite is the literary and debate society reimagined as a media and education conglomerate, running a learning platform, publishing house, and digital research division.",
    subsidiaries: ["ERLEARN", "ERPRESS", "ERLAB"],
    totalEmployees: 420 + 210 + 110,
    logoLetter: "R",
    founded: "2016",
  },
  {
    ticker: "MARC",
    name: "MARC Group",
    about: "MARC is AEON's foremost financial analytics holding, running finance advisory, market research, and management consulting divisions.",
    subsidiaries: ["MARCF", "MARCM", "MARCC"],
    totalEmployees: 620 + 340 + 180,
    logoLetter: "M",
    founded: "2018",
  },
  {
    ticker: "AMBROSIA",
    name: "Ambrosia Group",
    about: "Ambrosia is AEON's leading food and lifestyle conglomerate, operating upscale restaurant chains, a food-tech delivery platform, and a luxury dining brand.",
    subsidiaries: ["AMBR", "AMBF", "AMBL"],
    totalEmployees: 380 + 200 + 90,
    logoLetter: "A",
    founded: "2019",
  },
  {
    ticker: "ROBOVERSE",
    name: "Roboverse Group",
    about: "Roboverse designs and manufactures autonomous robotic systems for defense and industrial applications, from combat bots to AI-powered automation platforms.",
    subsidiaries: ["RBVX", "RBVM", "RBVA"],
    totalEmployees: 720 + 480 + 210,
    logoLetter: "R",
    founded: "2018",
  },
  {
    ticker: "COGNITIA",
    name: "Cognitia Group",
    about: "Cognitia is a cognitive technology conglomerate specialising in AI research, behavioural analytics, and next-generation intelligent products for enterprise and government.",
    subsidiaries: ["CGNR", "CGNA", "CGNX"],
    totalEmployees: 680 + 400 + 160,
    logoLetter: "C",
    founded: "2017",
  },
  {
    ticker: "GASMONKEYS",
    name: "Gas Monkeys Group",
    about: "Gas Monkeys is AEON's iconic automotive conglomerate, running a formula motorsport team, a parts manufacturing plant, and a vehicle servicing network.",
    subsidiaries: ["GMRACE", "GMAUTO", "GMSERV"],
    totalEmployees: 550 + 380 + 200,
    logoLetter: "G",
    founded: "2019",
  },
  {
    ticker: "LINCOLNLABS",
    name: "Lincoln Labs Group",
    about: "Lincoln Labs is AEON's premier research conglomerate spanning medical devices, pharmaceutical R&D, and biotech innovation.",
    subsidiaries: ["LLMED", "LLRES", "LLBIO"],
    totalEmployees: 780 + 450 + 200,
    logoLetter: "L",
    founded: "2016",
  },
  {
    ticker: "AERO",
    name: "Aero Group",
    about: "Aero is a defense-tech group building autonomous drone systems, advanced propulsion units, and integrated avionics for defense and civilian aerospace applications.",
    subsidiaries: ["AEROD", "AEROP", "AEROS"],
    totalEmployees: 700 + 420 + 190,
    logoLetter: "A",
    founded: "2018",
  },
  {
    ticker: "APEXPMI",
    name: "Apex PMI Group",
    about: "Apex PMI is AEON's flagship project management and financial advisory conglomerate, offering infrastructure finance, investment management, and executive consulting.",
    subsidiaries: ["APXF", "APXI", "APXM"],
    totalEmployees: 580 + 320 + 165,
    logoLetter: "A",
    founded: "2017",
  },
  {
    ticker: "ACM",
    name: "ACM Group",
    about: "ACM Group is a technology conglomerate born from the computing society, running applied research, enterprise software, and a data science platform across AEON's institutions.",
    subsidiaries: ["ACMR", "ACMS", "ACMD"],
    totalEmployees: 640 + 380 + 175,
    logoLetter: "A",
    founded: "2017",
  },
  {
    ticker: "ADVENTURE",
    name: "Adventure Group",
    about: "Adventure Group is AEON's premier outdoor and experiential lifestyle company, operating adventure tourism circuits, a sports equipment brand, and immersive experience parks.",
    subsidiaries: ["ADVT", "ADVS", "ADVX"],
    totalEmployees: 340 + 175 + 85,
    logoLetter: "A",
    founded: "2020",
  },
  {
    ticker: "AUV",
    name: "AUV Group",
    about: "AUV Group develops autonomous underwater vehicles for defense surveillance, deep-sea exploration, and marine infrastructure monitoring.",
    subsidiaries: ["AUVS", "AUVR", "AUVM"],
    totalEmployees: 620 + 360 + 160,
    logoLetter: "U",
    founded: "2018",
  },
  {
    ticker: "MEDIA",
    name: "Media Group",
    about: "Media Group is AEON's broadcast and content powerhouse, running a film and TV production studio, a digital content network, and a multi-channel broadcast platform.",
    subsidiaries: ["MEDP", "MEDD", "MEDB"],
    totalEmployees: 500 + 270 + 130,
    logoLetter: "M",
    founded: "2017",
  },
  {
    ticker: "AEIFORIA",
    name: "Aeiforia Group",
    about: "Aeiforia curates fashion, arts, and premium lifestyle for AEON's discerning consumers, operating a fashion house, an arts collective, and a luxury lifestyle brand.",
    subsidiaries: ["AEIF", "AEIA", "AEIL"],
    totalEmployees: 310 + 155 + 80,
    logoLetter: "A",
    founded: "2019",
  },
  {
    ticker: "QUBIT",
    name: "Qubit Group",
    about: "Qubit Group is AEON's quantum computing pioneer, running advanced quantum research, quantum software development, and consulting services for enterprises entering the quantum era.",
    subsidiaries: ["QBTR", "QBTS", "QBTC"],
    totalEmployees: 880 + 520 + 240,
    logoLetter: "Q",
    founded: "2018",
  },
  {
    ticker: "MASTERSHOT",
    name: "MasterShot Group",
    about: "MasterShot Group is the media and entertainment society turned AEON's top entertainment company, producing films, digital content, and operating a broad media distribution network.",
    subsidiaries: ["MSSTD", "MSDIGI", "MSMEDIA"],
    totalEmployees: 560 + 290 + 145,
    logoLetter: "S",
    founded: "2017",
  },
  {
    ticker: "EIC",
    name: "EIC Group",
    about: "EIC Group is AEON's startup ecosystem conglomerate, running early-stage venture finance, growth investment, and innovation management.",
    subsidiaries: ["EICF", "EICI", "EICM"],
    totalEmployees: 520 + 280 + 140,
    logoLetter: "E",
    founded: "2018",
  },
  {
    ticker: "SYNOLO",
    name: "Synolo Group",
    about: "Synolo is AEON's cultural production and community entertainment group, running a live-events studio, a productions label, and a cross-sector innovation arm.",
    subsidiaries: ["SYNS", "SYNP", "SYNI"],
    totalEmployees: 365 + 195 + 95,
    logoLetter: "S",
    founded: "2019",
  },
];

export const parentDirectory: Record<string, ParentCompany> = {};
for (const p of parentCompanies) parentDirectory[p.ticker] = p;

export function getSubsidiariesOf(parentTicker: string): string[] {
  return parentDirectory[parentTicker]?.subsidiaries ?? [];
}

// ─── Portfolio / Investments ────────────────────────────
export const investments = {
  currentValue: 0,
  investedValue: 0,
  totalReturns: 0,
  totalReturnsPercent: 0,
  dayReturns: 0,
  dayReturnsPercent: 0,
};

// ─── Holdings ───────────────────────────────────────────
export interface Holding {
  ticker: string;
  name: string;
  qty: number;
  avgPrice: number;
  currentPrice: number;
  dayChange: number;
  dayChangePercent: number;
  returns: number;
  returnsPercent: number;
  currentValue: number;
  investedValue: number;
  sparkline: number[];
}

export const holdings: Holding[] = [];

// ─── Watchlist ──────────────────────────────────────────
export interface WatchlistStock {
  ticker: string;
  name: string;
  shares?: number;
  price: number;
  dayChange: number;
  dayChangePercent: number;
  volume: string;
  w52Low: number;
  w52High: number;
  sparkline: number[];
}

// Real watchlist is pulled from /api/investor/watchlist via TradingContext.
// This is just the fallback for unauthenticated rendering.
export const watchlist: WatchlistStock[] = [];

// ─── Most Traded ────────────────────────────────────────
export interface MostTradedStock {
  ticker: string;
  name: string;
  price: number;
  dayChange: number;
  dayChangePercent: number;
}

// Live "most traded" is pulled via the screener API. This is the empty default.
export const mostTraded: MostTradedStock[] = [];

// ─── Top Movers ─────────────────────────────────────────
export interface MoverStock {
  ticker: string;
  name: string;
  price: number;
  dayChangePercent: number;
  volume: string;
  sparkline: number[];
}

// Live movers come from /api/market/screener (polled in each page that uses them).
export const topGainers: MoverStock[] = [];
export const topLosers: MoverStock[] = [];
export const volumeShockers: MoverStock[] = [];

// ─── Market Breadth ─────────────────────────────────────
// Live breadth comes from /api/market/breadth. This is a zeroed default.
export const marketBreadth = {
  advances: 0,
  declines: 0,
  unchanged: 0,
};

// ─── Products & Tools ───────────────────────────────────
export const productsAndTools = [
  { label: "INTRADAY SCREENER", icon: "scan", description: "Filter stocks by technical signals" },
  { label: "EVENTS CALENDAR", icon: "calendar", description: "Track corporate events and results" },
];

// ─── User Profile ───────────────────────────────────────
export const userProfile = {
  name: "Demo Investor",
  email: "demo@mcse.in",
  balance: 0,
  joined: "Apr 2026",
  phone: "+91 98765 43210",
  kycStatus: "VERIFIED",
};

// ─── Portfolio Analysis ─────────────────────────────────
export const portfolioAnalysis = {
  currentValue: 0,
  investedValue: 0,
  totalReturns: 0,
  totalReturnsPercent: 0,
  eventReturnPct: 0,
  benchmarkName: "AEON 50",
  benchmarkAeon50Pct: 0,
  alphaPct: 0,
  sectorAllocation: [] as { sector: string; value: number }[],
  marketCapAllocation: [] as { cap: string; value: number }[],
  performanceChart: [] as { month: string; portfolio: number; benchmark: number }[],
};

// ─── News Items ─────────────────────────────────────────
export interface NewsItem {
  ticker: string;
  name: string;
  headline: string;
  body: string;
  timestamp: number;
  price: number;
  dayChange: number;
  dayChangePercent: number;
}

// Live news comes from /api/market/news (LLM-generated + company-submitted).
// This empty array is just a fallback for components that haven't been wired to the API yet.
export const newsItems: NewsItem[] = [];

export function formatRelativeTime(ts: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Trading Screens ────────────────────────────────────
export interface TradingScreen {
  signal: "Bullish" | "Bearish";
  label: string;
  sparkline: number[];
}

export const tradingScreens: TradingScreen[] = [
  { signal: "Bullish", label: "Resistance breakouts", sparkline: [40, 42, 41, 45, 48, 52, 55] },
  { signal: "Bullish", label: "MACD above signal line", sparkline: [30, 32, 35, 38, 42, 45, 50] },
  { signal: "Bearish", label: "RSI overbought", sparkline: [60, 58, 55, 52, 48, 45, 42] },
  { signal: "Bullish", label: "RSI oversold", sparkline: [35, 38, 42, 40, 44, 48, 52] },
];

// ─── Stock Directory (lookup any ticker) ────────────────
export interface StockFundamentals {
  marketCap: string;
  pe: number;
  eps: number;
  bookValue: number;
  roe: number;
  w52High: number;
  w52Low: number;
  volume: string;
  avgVolume: string;
  sector: string;
}

export interface StockInfo {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  about: string;
  parentCompany: string;
  chartData: Record<string, { day: string; price: number }[]>;
  overview: { open: number; dayLow: number; dayHigh: number };
  fundamentals: StockFundamentals;
  events?: { title: string; date: string; type: "RESULTS" | "AGM" | "DIVIDEND" | "EVENT" }[];
}

function generateChartData(basePrice: number): Record<string, { day: string; price: number }[]> {
  const rng = (p: number, pct: number) => +(p * (1 + (Math.random() - 0.5) * pct)).toFixed(2);

  // 1H: every minute from 10:00 to 10:59 (60 points)
  const oneH: { day: string; price: number }[] = [];
  for (let m = 0; m < 60; m++) {
    const mm = String(m).padStart(2, "0");
    const drift = Math.abs(m - 30) / 30;
    oneH.push({ day: `10:${mm}`, price: rng(basePrice, 0.006 * (1 - drift * 0.3)) });
  }
  oneH[oneH.length - 1].price = basePrice;

  // 3H: every minute from 10:00 to 12:59 (180 points)
  const threeH: { day: string; price: number }[] = [];
  for (let h = 10; h <= 12; h++) {
    for (let m = 0; m < 60; m++) {
      const mm = String(m).padStart(2, "0");
      const drift = Math.abs((h - 10) * 60 + m - 90) / 90;
      threeH.push({ day: `${h}:${mm}`, price: rng(basePrice, 0.015 * (1 - drift * 0.3)) });
    }
  }
  threeH[threeH.length - 1].price = basePrice;

  // 1D: every 30 minutes from 10:00 to 17:30 (16 points)
  const oneD: { day: string; price: number }[] = [];
  for (let h = 10; h <= 17; h++) {
    oneD.push({ day: `${h}:00`, price: rng(basePrice, 0.025) });
    if (h < 17) oneD.push({ day: `${h}:30`, price: rng(basePrice, 0.025) });
  }
  oneD.push({ day: "17:30", price: basePrice });

  return {
    "1H": oneH,
    "3H": threeH,
    "1D": oneD,
    "3D": [
      { day: "APR 24", price: rng(basePrice, 0.04) },
      { day: "24 EVE", price: rng(basePrice, 0.035) },
      { day: "APR 25", price: rng(basePrice, 0.03) },
      { day: "25 EVE", price: rng(basePrice, 0.025) },
      { day: "APR 26", price: rng(basePrice, 0.02) },
      { day: "26 EVE", price: rng(basePrice, 0.01) },
      { day: "CLOSE", price: basePrice },
    ],
    "ALL": [
      { day: "APR 24", price: rng(basePrice, 0.06) },
      { day: "24 AFT", price: rng(basePrice, 0.05) },
      { day: "24 EVE", price: rng(basePrice, 0.04) },
      { day: "APR 25", price: rng(basePrice, 0.05) },
      { day: "25 AFT", price: rng(basePrice, 0.04) },
      { day: "25 EVE", price: rng(basePrice, 0.03) },
      { day: "APR 26", price: rng(basePrice, 0.04) },
      { day: "26 AFT", price: rng(basePrice, 0.02) },
      { day: "26 EVE", price: rng(basePrice, 0.01) },
      { day: "CLOSE", price: basePrice },
    ],
  };
}

export const allStocksRaw = [
  // ── ENIGMA Group ──────────────────────
  { ticker: "ESOFT",  name: "Enigma Software",  price: 2990, changePercent: 0, parentCompany: "ENIGMA",  about: "Enigma Software is the flagship development arm of Enigma Group, specialising in enterprise platforms, competitive programming tools, and large-scale open-source contributions." },
  { ticker: "ECLOUD", name: "Enigma Cloud",     price: 1720, changePercent: 0, parentCompany: "ENIGMA",  about: "Enigma Cloud provides managed cloud infrastructure and hosting services powering campus applications and partner workloads." },
  { ticker: "ENAI",   name: "Enigma AI",        price: 875,  changePercent: 0, parentCompany: "ENIGMA",  about: "Enigma AI is the emerging artificial intelligence research lab of Enigma Group, building ML models and open-source language tools." },
  // ── ERUDITE Group ─────────────────────
  { ticker: "ERLEARN", name: "Erudite Learn",  price: 985,  changePercent: 0, parentCompany: "ERUDITE", about: "Erudite Learn is the flagship online learning platform of Erudite Group, offering courses in debate, communication, and critical thinking." },
  { ticker: "ERPRESS", name: "Erudite Press",  price: 565,  changePercent: 0, parentCompany: "ERUDITE", about: "Erudite Press is the publishing house of Erudite Group, running a quarterly literary magazine and writer-in-residence fellowship." },
  { ticker: "ERLAB",   name: "Erudite Labs",   price: 280,  changePercent: 0, parentCompany: "ERUDITE", about: "Erudite Labs is the emerging research division of Erudite Group, working at the intersection of linguistics, cognition, and digital media." },
  // ── MARC Group ────────────────────────
  { ticker: "MARCF", name: "MARC Finance",    price: 1795, changePercent: 0, parentCompany: "MARC", about: "MARC Finance is the flagship financial advisory unit of MARC Group, serving corporate clients with capital advisory and treasury services." },
  { ticker: "MARCM", name: "MARC Markets",    price: 1020, changePercent: 0, parentCompany: "MARC", about: "MARC Markets provides market research, trading intelligence, and analytics products for institutional and retail clients." },
  { ticker: "MARCC", name: "MARC Consulting", price: 500,  changePercent: 0, parentCompany: "MARC", about: "MARC Consulting is the emerging management advisory arm, advising on strategy, operations, and transformation engagements." },
  // ── AMBROSIA Group ────────────────────
  { ticker: "AMBR", name: "Ambrosia Restaurants", price: 690, changePercent: 0, parentCompany: "AMBROSIA", about: "Ambrosia Restaurants operates AEON's flagship upscale casual-dining chain, beloved for curated menus and signature experiences." },
  { ticker: "AMBF", name: "Ambrosia Fresh",       price: 385, changePercent: 0, parentCompany: "AMBROSIA", about: "Ambrosia Fresh is the food-tech and delivery platform of Ambrosia Group, offering subscription meals and premium grocery." },
  { ticker: "AMBL", name: "Ambrosia Luxe",        price: 190, changePercent: 0, parentCompany: "AMBROSIA", about: "Ambrosia Luxe is the emerging luxury dining and private events brand of Ambrosia Group." },
  // ── ROBOVERSE Group ───────────────────
  { ticker: "RBVX", name: "Roboverse Systems",       price: 2260, changePercent: 0, parentCompany: "ROBOVERSE", about: "Roboverse Systems is the flagship defense robotics division, building autonomous combat and surveillance platforms." },
  { ticker: "RBVM", name: "Roboverse Manufacturing", price: 1275, changePercent: 0, parentCompany: "ROBOVERSE", about: "Roboverse Manufacturing runs the group's precision robotics fabrication plants and supplies systems-grade components." },
  { ticker: "RBVA", name: "Roboverse AI",            price: 850,  changePercent: 0, parentCompany: "ROBOVERSE", about: "Roboverse AI is the emerging AI brain behind Roboverse's platforms, focused on perception, planning, and autonomy." },
  // ── COGNITIA Group ────────────────────
  { ticker: "CGNR", name: "Cognitia Research",  price: 2850, changePercent: 0, parentCompany: "COGNITIA", about: "Cognitia Research is the flagship AI research lab of Cognitia Group, publishing at top venues and licensing enterprise IP." },
  { ticker: "CGNA", name: "Cognitia Analytics", price: 1630, changePercent: 0, parentCompany: "COGNITIA", about: "Cognitia Analytics delivers behavioural analytics and decision-intelligence platforms to enterprise and government clients." },
  { ticker: "CGNX", name: "Cognitia X",         price: 810,  changePercent: 0, parentCompany: "COGNITIA", about: "Cognitia X is the emerging moonshot arm of Cognitia Group, incubating next-generation intelligent products." },
  // ── GASMONKEYS Group ──────────────────
  { ticker: "GMRACE", name: "GM Racing",     price: 1390, changePercent: 0, parentCompany: "GASMONKEYS", about: "GM Racing is the flagship formula motorsport team of Gas Monkeys Group, fielding cars at national-level circuits." },
  { ticker: "GMAUTO", name: "GM Automotive", price: 805,  changePercent: 0, parentCompany: "GASMONKEYS", about: "GM Automotive is the parts manufacturing plant of Gas Monkeys, producing precision automotive components at scale." },
  { ticker: "GMSERV", name: "GM Services",   price: 395,  changePercent: 0, parentCompany: "GASMONKEYS", about: "GM Services is the emerging vehicle servicing network of Gas Monkeys, running service bays and mobile repair units." },
  // ── LINCOLNLABS Group ─────────────────
  { ticker: "LLMED", name: "Lincoln Medical",  price: 2555, changePercent: 0, parentCompany: "LINCOLNLABS", about: "Lincoln Medical is the flagship medical devices division of Lincoln Labs, selling diagnostic and therapeutic devices to hospitals." },
  { ticker: "LLRES", name: "Lincoln Research", price: 1465, changePercent: 0, parentCompany: "LINCOLNLABS", about: "Lincoln Research is the pharmaceutical R&D arm, running discovery and late-stage trials across multiple therapy areas." },
  { ticker: "LLBIO", name: "Lincoln Bio",      price: 720,  changePercent: 0, parentCompany: "LINCOLNLABS", about: "Lincoln Bio is the emerging biotech innovation unit, working on cell and gene therapies and precision bio-platforms." },
  // ── AERO Group ────────────────────────
  { ticker: "AEROD", name: "Aero Drones",     price: 2230, changePercent: 0, parentCompany: "AERO", about: "Aero Drones is the flagship autonomous drone division, delivering defense and civilian UAV platforms at scale." },
  { ticker: "AEROP", name: "Aero Propulsion", price: 1275, changePercent: 0, parentCompany: "AERO", about: "Aero Propulsion designs and manufactures advanced propulsion units for aerospace and defense applications." },
  { ticker: "AEROS", name: "Aero Systems",    price: 625,  changePercent: 0, parentCompany: "AERO", about: "Aero Systems is the emerging integrated avionics unit, building flight-control and sensor-fusion systems." },
  // ── APEXPMI Group ─────────────────────
  { ticker: "APXF", name: "Apex Finance",        price: 1725, changePercent: 0, parentCompany: "APEXPMI", about: "Apex Finance is the flagship project and structured finance division of Apex PMI Group." },
  { ticker: "APXI", name: "Apex Infrastructure", price: 995,  changePercent: 0, parentCompany: "APEXPMI", about: "Apex Infrastructure finances and manages infrastructure projects across transport, energy, and urban development." },
  { ticker: "APXM", name: "Apex Management",     price: 495,  changePercent: 0, parentCompany: "APEXPMI", about: "Apex Management is the emerging investment management arm, running discretionary portfolios for select clients." },
  // ── ACM Group ─────────────────────────
  { ticker: "ACMR", name: "ACM Research", price: 2815, changePercent: 0, parentCompany: "ACM", about: "ACM Research is the flagship applied computing research lab, shipping peer-reviewed work and enterprise-grade IP." },
  { ticker: "ACMS", name: "ACM Software", price: 1605, changePercent: 0, parentCompany: "ACM", about: "ACM Software builds the group's enterprise software platforms used across AEON's institutions." },
  { ticker: "ACMD", name: "ACM Data",     price: 810,  changePercent: 0, parentCompany: "ACM", about: "ACM Data is the emerging data-science platform arm of ACM Group, delivering analytics and ML infrastructure." },
  // ── ADVENTURE Group ───────────────────
  { ticker: "ADVT", name: "Adventure Tourism",    price: 670, changePercent: 0, parentCompany: "ADVENTURE", about: "Adventure Tourism runs the flagship outdoor tourism circuits and curated adventure trips of Adventure Group." },
  { ticker: "ADVS", name: "Adventure Sports",     price: 385, changePercent: 0, parentCompany: "ADVENTURE", about: "Adventure Sports is the sports equipment and apparel brand of Adventure Group, sold both online and at owned stores." },
  { ticker: "ADVX", name: "Adventure Experience", price: 190, changePercent: 0, parentCompany: "ADVENTURE", about: "Adventure Experience is the emerging experience-parks arm, building immersive outdoor-themed destinations." },
  // ── AUV Group ─────────────────────────
  { ticker: "AUVS", name: "AUV Systems",  price: 2120, changePercent: 0, parentCompany: "AUV", about: "AUV Systems is the flagship autonomous underwater vehicle division, selling defense-grade platforms to government buyers." },
  { ticker: "AUVR", name: "AUV Research", price: 1205, changePercent: 0, parentCompany: "AUV", about: "AUV Research is the deep-sea exploration and research arm, operating scientific platforms for public and private clients." },
  { ticker: "AUVM", name: "AUV Marine",   price: 590,  changePercent: 0, parentCompany: "AUV", about: "AUV Marine is the emerging marine-infrastructure monitoring arm, inspecting pipelines, cables, and offshore assets." },
  // ── MEDIA Group ───────────────────────
  { ticker: "MEDP", name: "Media Productions", price: 960, changePercent: 0, parentCompany: "MEDIA", about: "Media Productions is the flagship film and TV production studio of Media Group." },
  { ticker: "MEDD", name: "Media Digital",     price: 550, changePercent: 0, parentCompany: "MEDIA", about: "Media Digital runs the group's digital content network and short-form video channels." },
  { ticker: "MEDB", name: "Media Broadcast",   price: 270, changePercent: 0, parentCompany: "MEDIA", about: "Media Broadcast is the emerging multi-channel broadcast platform of Media Group." },
  // ── AEIFORIA Group ────────────────────
  { ticker: "AEIF", name: "Aeiforia Fashion",   price: 660, changePercent: 0, parentCompany: "AEIFORIA", about: "Aeiforia Fashion is the flagship fashion house, curating seasonal collections and couture lines for discerning customers." },
  { ticker: "AEIA", name: "Aeiforia Arts",      price: 510, changePercent: 0, parentCompany: "AEIFORIA", about: "Aeiforia Arts is the arts collective and gallery arm, running exhibitions, editions, and artist residencies." },
  { ticker: "AEIL", name: "Aeiforia Lifestyle", price: 190, changePercent: 0, parentCompany: "AEIFORIA", about: "Aeiforia Lifestyle is the emerging luxury-lifestyle brand, covering home, wellness, and accessories categories." },
  // ── QUBIT Group ───────────────────────
  { ticker: "QBTR", name: "Qubit Research",   price: 3095, changePercent: 0, parentCompany: "QUBIT", about: "Qubit Research is the flagship quantum computing research lab, pushing the frontier on hardware and error correction." },
  { ticker: "QBTS", name: "Qubit Software",   price: 1760, changePercent: 0, parentCompany: "QUBIT", about: "Qubit Software builds quantum-ready compilers, libraries, and middleware for enterprises exploring quantum workloads." },
  { ticker: "QBTC", name: "Qubit Consulting", price: 875,  changePercent: 0, parentCompany: "QUBIT", about: "Qubit Consulting is the emerging advisory arm, helping enterprises plan their quantum transition roadmap." },
  // ── MASTERSHOT Group ──────────────────
  { ticker: "MSSTD",   name: "MasterShot Studios", price: 1010, changePercent: 0, parentCompany: "MASTERSHOT", about: "MasterShot Studios is the flagship film production studio of MasterShot Group, producing features, shorts, and series." },
  { ticker: "MSDIGI",  name: "MasterShot Digital", price: 580,  changePercent: 0, parentCompany: "MASTERSHOT", about: "MasterShot Digital runs the group's digital content, streaming channels, and social-media-first originals." },
  { ticker: "MSMEDIA", name: "MasterShot Media",   price: 290,  changePercent: 0, parentCompany: "MASTERSHOT", about: "MasterShot Media is the emerging media distribution and rights-licensing platform of MasterShot Group." },
  // ── EIC Group ─────────────────────────
  { ticker: "EICF", name: "EIC Finance",     price: 1700, changePercent: 0, parentCompany: "EIC", about: "EIC Finance is the flagship early-stage venture finance arm, funding AEON-born startups from seed to Series B." },
  { ticker: "EICI", name: "EIC Investments", price: 965,  changePercent: 0, parentCompany: "EIC", about: "EIC Investments is the growth-stage investment manager of EIC Group, backing scaling companies with follow-on capital." },
  { ticker: "EICM", name: "EIC Management",  price: 470,  changePercent: 0, parentCompany: "EIC", about: "EIC Management is the emerging innovation-management advisory arm, partnering with corporates on venture-building." },
  // ── SYNOLO Group ──────────────────────
  { ticker: "SYNS", name: "Synolo Studios",     price: 900, changePercent: 0, parentCompany: "SYNOLO", about: "Synolo Studios is the flagship live-events and immersive experience studio of Synolo Group." },
  { ticker: "SYNP", name: "Synolo Productions", price: 510, changePercent: 0, parentCompany: "SYNOLO", about: "Synolo Productions is the label arm, producing albums, podcasts, and audio-first originals." },
  { ticker: "SYNI", name: "Synolo Innovation",  price: 255, changePercent: 0, parentCompany: "SYNOLO", about: "Synolo Innovation is the emerging cross-sector innovation arm, prototyping tech-meets-culture products." },
];

// Fundamentals built from seed.ts values.
// Financial seed numbers are in thousands of \u20B9; shares are in thousands.
// marketCap is displayed as Cr (crore) = (price * sharesOut) / 1e7.
type SeedRow = {
  ticker: string;
  sector: string;
  pq: number; bs: number; cs: number;
  revenue: number; expenses: number;
  assets: number; liabilities: number;
  employees: number; shares: number;
};

const SEED_ROWS: SeedRow[] = [
  { ticker: "ESOFT",  sector: "Technology",      pq: 85, bs: 82, cs: 80, revenue: 450000, expenses: 320000, assets: 310000, liabilities: 180000, employees: 850, shares: 10000 },
  { ticker: "ECLOUD", sector: "Technology",      pq: 78, bs: 74, cs: 76, revenue: 280000, expenses: 210000, assets: 220000, liabilities: 140000, employees: 520, shares: 8000 },
  { ticker: "ENAI",   sector: "Technology",      pq: 72, bs: 68, cs: 70, revenue: 120000, expenses: 110000, assets: 120000, liabilities: 70000,  employees: 280, shares: 5000 },
  { ticker: "ERLEARN", sector: "Media",          pq: 82, bs: 78, cs: 84, revenue: 180000, expenses: 130000, assets: 180000, liabilities: 100000, employees: 420, shares: 6000 },
  { ticker: "ERPRESS", sector: "Media",          pq: 75, bs: 72, cs: 77, revenue: 90000,  expenses: 72000,  assets: 95000,  liabilities: 55000,  employees: 210, shares: 4000 },
  { ticker: "ERLAB",   sector: "Media",          pq: 68, bs: 62, cs: 65, revenue: 40000,  expenses: 38000,  assets: 55000,  liabilities: 30000,  employees: 110, shares: 3000 },
  { ticker: "MARCF", sector: "Finance",          pq: 80, bs: 77, cs: 78, revenue: 320000, expenses: 240000, assets: 280000, liabilities: 160000, employees: 620, shares: 7500 },
  { ticker: "MARCM", sector: "Finance",          pq: 73, bs: 70, cs: 72, revenue: 175000, expenses: 140000, assets: 160000, liabilities: 95000,  employees: 340, shares: 5000 },
  { ticker: "MARCC", sector: "Finance",          pq: 65, bs: 62, cs: 67, revenue: 80000,  expenses: 68000,  assets: 85000,  liabilities: 50000,  employees: 180, shares: 3500 },
  { ticker: "AMBR", sector: "Consumer Goods",    pq: 78, bs: 75, cs: 82, revenue: 140000, expenses: 110000, assets: 130000, liabilities: 75000,  employees: 380, shares: 5000 },
  { ticker: "AMBF", sector: "Consumer Goods",    pq: 70, bs: 68, cs: 73, revenue: 70000,  expenses: 60000,  assets: 72000,  liabilities: 42000,  employees: 200, shares: 3500 },
  { ticker: "AMBL", sector: "Consumer Goods",    pq: 62, bs: 65, cs: 60, revenue: 30000,  expenses: 28000,  assets: 38000,  liabilities: 22000,  employees: 90,  shares: 2500 },
  { ticker: "RBVX", sector: "Defense",           pq: 83, bs: 79, cs: 76, revenue: 380000, expenses: 280000, assets: 350000, liabilities: 200000, employees: 720, shares: 8000 },
  { ticker: "RBVM", sector: "Defense",           pq: 75, bs: 71, cs: 69, revenue: 210000, expenses: 165000, assets: 210000, liabilities: 120000, employees: 480, shares: 6000 },
  { ticker: "RBVA", sector: "Technology",        pq: 70, bs: 66, cs: 68, revenue: 85000,  expenses: 80000,  assets: 105000, liabilities: 60000,  employees: 210, shares: 4000 },
  { ticker: "CGNR", sector: "Technology",        pq: 81, bs: 78, cs: 75, revenue: 310000, expenses: 240000, assets: 310000, liabilities: 175000, employees: 680, shares: 7500 },
  { ticker: "CGNA", sector: "Technology",        pq: 74, bs: 72, cs: 71, revenue: 180000, expenses: 145000, assets: 190000, liabilities: 110000, employees: 400, shares: 5500 },
  { ticker: "CGNX", sector: "Technology",        pq: 67, bs: 64, cs: 65, revenue: 60000,  expenses: 58000,  assets: 80000,  liabilities: 45000,  employees: 160, shares: 3000 },
  { ticker: "GMRACE", sector: "Automotive",      pq: 79, bs: 82, cs: 78, revenue: 250000, expenses: 195000, assets: 240000, liabilities: 140000, employees: 550, shares: 6500 },
  { ticker: "GMAUTO", sector: "Automotive",      pq: 73, bs: 70, cs: 72, revenue: 150000, expenses: 122000, assets: 155000, liabilities: 90000,  employees: 380, shares: 5000 },
  { ticker: "GMSERV", sector: "Automotive",      pq: 65, bs: 63, cs: 68, revenue: 65000,  expenses: 57000,  assets: 70000,  liabilities: 40000,  employees: 200, shares: 3500 },
  { ticker: "LLMED", sector: "Pharmaceutical",   pq: 84, bs: 80, cs: 83, revenue: 420000, expenses: 310000, assets: 420000, liabilities: 230000, employees: 780, shares: 9000 },
  { ticker: "LLRES", sector: "Pharmaceutical",   pq: 77, bs: 74, cs: 76, revenue: 220000, expenses: 175000, assets: 240000, liabilities: 135000, employees: 450, shares: 6000 },
  { ticker: "LLBIO", sector: "Pharmaceutical",   pq: 69, bs: 66, cs: 70, revenue: 85000,  expenses: 80000,  assets: 110000, liabilities: 60000,  employees: 200, shares: 3500 },
  { ticker: "AEROD", sector: "Defense",          pq: 82, bs: 78, cs: 74, revenue: 360000, expenses: 270000, assets: 360000, liabilities: 205000, employees: 700, shares: 8000 },
  { ticker: "AEROP", sector: "Defense",          pq: 75, bs: 72, cs: 70, revenue: 195000, expenses: 158000, assets: 210000, liabilities: 120000, employees: 420, shares: 5500 },
  { ticker: "AEROS", sector: "Defense",          pq: 67, bs: 64, cs: 65, revenue: 75000,  expenses: 70000,  assets: 90000,  liabilities: 52000,  employees: 190, shares: 3500 },
  { ticker: "APXF", sector: "Finance",           pq: 77, bs: 74, cs: 76, revenue: 290000, expenses: 225000, assets: 285000, liabilities: 165000, employees: 580, shares: 7000 },
  { ticker: "APXI", sector: "Finance",           pq: 71, bs: 68, cs: 70, revenue: 155000, expenses: 128000, assets: 160000, liabilities: 92000,  employees: 320, shares: 5000 },
  { ticker: "APXM", sector: "Finance",           pq: 64, bs: 61, cs: 65, revenue: 68000,  expenses: 60000,  assets: 78000,  liabilities: 45000,  employees: 165, shares: 3000 },
  { ticker: "ACMR", sector: "Technology",        pq: 80, bs: 76, cs: 74, revenue: 290000, expenses: 225000, assets: 295000, liabilities: 170000, employees: 640, shares: 7500 },
  { ticker: "ACMS", sector: "Technology",        pq: 73, bs: 70, cs: 71, revenue: 165000, expenses: 135000, assets: 175000, liabilities: 100000, employees: 380, shares: 5000 },
  { ticker: "ACMD", sector: "Technology",        pq: 67, bs: 64, cs: 66, revenue: 65000,  expenses: 61000,  assets: 85000,  liabilities: 48000,  employees: 175, shares: 3000 },
  { ticker: "ADVT", sector: "Consumer Goods",    pq: 76, bs: 72, cs: 80, revenue: 125000, expenses: 98000,  assets: 120000, liabilities: 68000,  employees: 340, shares: 4500 },
  { ticker: "ADVS", sector: "Consumer Goods",    pq: 70, bs: 68, cs: 73, revenue: 62000,  expenses: 54000,  assets: 65000,  liabilities: 38000,  employees: 175, shares: 3500 },
  { ticker: "ADVX", sector: "Consumer Goods",    pq: 62, bs: 60, cs: 65, revenue: 28000,  expenses: 26000,  assets: 34000,  liabilities: 20000,  employees: 85,  shares: 2500 },
  { ticker: "AUVS", sector: "Defense",           pq: 78, bs: 74, cs: 72, revenue: 310000, expenses: 245000, assets: 310000, liabilities: 180000, employees: 620, shares: 7000 },
  { ticker: "AUVR", sector: "Defense",           pq: 71, bs: 68, cs: 67, revenue: 165000, expenses: 138000, assets: 175000, liabilities: 100000, employees: 360, shares: 5000 },
  { ticker: "AUVM", sector: "Defense",           pq: 63, bs: 60, cs: 62, revenue: 62000,  expenses: 59000,  assets: 78000,  liabilities: 45000,  employees: 160, shares: 3000 },
  { ticker: "MEDP", sector: "Media",             pq: 80, bs: 78, cs: 77, revenue: 210000, expenses: 165000, assets: 210000, liabilities: 120000, employees: 500, shares: 6500 },
  { ticker: "MEDD", sector: "Media",             pq: 73, bs: 71, cs: 74, revenue: 110000, expenses: 90000,  assets: 115000, liabilities: 65000,  employees: 270, shares: 4500 },
  { ticker: "MEDB", sector: "Media",             pq: 65, bs: 63, cs: 67, revenue: 48000,  expenses: 43000,  assets: 55000,  liabilities: 32000,  employees: 130, shares: 3000 },
  { ticker: "AEIF", sector: "Consumer Goods",    pq: 75, bs: 78, cs: 73, revenue: 115000, expenses: 90000,  assets: 112000, liabilities: 62000,  employees: 310, shares: 4500 },
  { ticker: "AEIA", sector: "Media",             pq: 68, bs: 72, cs: 70, revenue: 58000,  expenses: 50000,  assets: 65000,  liabilities: 37000,  employees: 155, shares: 3500 },
  { ticker: "AEIL", sector: "Consumer Goods",    pq: 62, bs: 65, cs: 60, revenue: 26000,  expenses: 24000,  assets: 32000,  liabilities: 18000,  employees: 80,  shares: 2500 },
  { ticker: "QBTR", sector: "Technology",        pq: 88, bs: 82, cs: 78, revenue: 480000, expenses: 360000, assets: 490000, liabilities: 270000, employees: 880, shares: 10000 },
  { ticker: "QBTS", sector: "Technology",        pq: 80, bs: 76, cs: 75, revenue: 255000, expenses: 200000, assets: 270000, liabilities: 155000, employees: 520, shares: 7000 },
  { ticker: "QBTC", sector: "Technology",        pq: 72, bs: 68, cs: 70, revenue: 100000, expenses: 92000,  assets: 115000, liabilities: 65000,  employees: 240, shares: 4000 },
  { ticker: "MSSTD",   sector: "Media",          pq: 84, bs: 82, cs: 80, revenue: 240000, expenses: 185000, assets: 240000, liabilities: 138000, employees: 560, shares: 7000 },
  { ticker: "MSDIGI",  sector: "Media",          pq: 77, bs: 75, cs: 76, revenue: 125000, expenses: 102000, assets: 130000, liabilities: 75000,  employees: 290, shares: 4500 },
  { ticker: "MSMEDIA", sector: "Media",          pq: 70, bs: 68, cs: 70, revenue: 55000,  expenses: 49000,  assets: 62000,  liabilities: 36000,  employees: 145, shares: 3500 },
  { ticker: "EICF", sector: "Finance",           pq: 76, bs: 73, cs: 75, revenue: 260000, expenses: 205000, assets: 265000, liabilities: 152000, employees: 520, shares: 6500 },
  { ticker: "EICI", sector: "Finance",           pq: 69, bs: 66, cs: 68, revenue: 138000, expenses: 115000, assets: 145000, liabilities: 83000,  employees: 280, shares: 4500 },
  { ticker: "EICM", sector: "Finance",           pq: 61, bs: 58, cs: 62, revenue: 55000,  expenses: 50000,  assets: 62000,  liabilities: 36000,  employees: 140, shares: 3000 },
  { ticker: "SYNS", sector: "Media",             pq: 75, bs: 73, cs: 77, revenue: 155000, expenses: 125000, assets: 155000, liabilities: 88000,  employees: 365, shares: 5500 },
  { ticker: "SYNP", sector: "Media",             pq: 68, bs: 66, cs: 70, revenue: 78000,  expenses: 67000,  assets: 82000,  liabilities: 46000,  employees: 195, shares: 4000 },
  { ticker: "SYNI", sector: "Technology",        pq: 62, bs: 60, cs: 63, revenue: 32000,  expenses: 30000,  assets: 42000,  liabilities: 24000,  employees: 95,  shares: 2500 },
];

const priceByTicker: Record<string, number> = {};
for (const s of allStocksRaw) priceByTicker[s.ticker] = s.price;

function formatCr(value: number): string {
  // value is in \u20B9. Convert to crore and format.
  const cr = value / 1e7;
  if (cr >= 100) return `${cr.toFixed(0)}Cr`;
  if (cr >= 10) return `${cr.toFixed(1)}Cr`;
  return `${cr.toFixed(2)}Cr`;
}

function formatVolume(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n}`;
}

const stockFundamentals: Record<string, StockFundamentals> = {};
for (const row of SEED_ROWS) {
  const price = priceByTicker[row.ticker] ?? 1000;
  const sharesOut = row.shares * 1000;
  const marketCapValue = price * sharesOut;
  const profit = (row.revenue - row.expenses) * 1000;
  const eps = profit / sharesOut;
  const pe = eps > 0 ? price / eps : 0;
  const equity = (row.assets - row.liabilities) * 1000;
  const bookValue = equity / sharesOut;
  const roe = equity > 0 ? (profit / equity) * 100 : 0;
  // Plausible volume: roughly 1–3% of float per day.
  const avgVol = Math.round(sharesOut * 0.018);
  const volume = Math.round(avgVol * 1.15);
  stockFundamentals[row.ticker] = {
    marketCap: formatCr(marketCapValue),
    pe: +pe.toFixed(1),
    eps: +eps.toFixed(2),
    bookValue: +bookValue.toFixed(2),
    roe: +roe.toFixed(1),
    w52High: Math.round(price * 1.28),
    w52Low: Math.round(price * 0.72),
    volume: formatVolume(volume),
    avgVolume: formatVolume(avgVol),
    sector: row.sector,
  };
}

export const stockDirectory: Record<string, StockInfo> = {};

const perStockEvents: Record<string, StockInfo["events"]> = {
  ESOFT: [
    { title: "Q4 Results Announcement", date: "2026-04-24", type: "RESULTS" },
    { title: "Annual General Meeting", date: "2026-04-26", type: "AGM" },
  ],
  ECLOUD: [
    { title: "Interim Dividend \u2014 \u20B912/share", date: "2026-04-25", type: "DIVIDEND" },
  ],
  ENAI: [
    { title: "AI Expo Showcase", date: "2026-04-26", type: "EVENT" },
    { title: "Q4 Results Announcement", date: "2026-04-24", type: "RESULTS" },
  ],
  GMRACE: [
    { title: "National Racing Championship", date: "2026-04-25", type: "EVENT" },
  ],
  GMAUTO: [
    { title: "Annual General Meeting", date: "2026-04-25", type: "AGM" },
    { title: "Q4 Results Announcement", date: "2026-04-26", type: "RESULTS" },
  ],
  MSSTD: [
    { title: "Film Festival Premiere", date: "2026-04-24", type: "EVENT" },
    { title: "Q4 Results Announcement", date: "2026-04-26", type: "RESULTS" },
  ],
  ERLEARN: [
    { title: "Q4 Results Announcement", date: "2026-04-25", type: "RESULTS" },
  ],
  LLMED: [
    { title: "Clinical Trial Readout", date: "2026-04-25", type: "EVENT" },
    { title: "Final Dividend \u2014 \u20B98/share", date: "2026-04-26", type: "DIVIDEND" },
  ],
  AEROD: [
    { title: "Defense Expo Showcase", date: "2026-04-24", type: "EVENT" },
    { title: "Q4 Results Announcement", date: "2026-04-26", type: "RESULTS" },
  ],
  QBTR: [
    { title: "Quantum Symposium", date: "2026-04-25", type: "EVENT" },
  ],
  CGNR: [
    { title: "Annual General Meeting", date: "2026-04-25", type: "AGM" },
  ],
};

for (const s of allStocksRaw) {
  const f = stockFundamentals[s.ticker];
  stockDirectory[s.ticker] = {
    ...s,
    chartData: generateChartData(s.price),
    overview: { open: s.price, dayLow: +(s.price * 0.985).toFixed(2), dayHigh: +(s.price * 1.012).toFixed(2) },
    fundamentals: f,
    events: perStockEvents[s.ticker],
  };
}

// Enriched flat list for screener / stocks page (merges fundamentals + sparkline)
const watchlistSparklines: Record<string, number[]> = {};
for (const w of watchlist) watchlistSparklines[w.ticker] = w.sparkline;

export const allStocksEnriched = allStocksRaw.map((s) => {
  const f = stockFundamentals[s.ticker];
  return {
    ticker: s.ticker,
    name: s.name,
    price: s.price,
    dayChangePercent: s.changePercent,
    sector: f.sector,
    pe: f.pe,
    volume: parseFloat(f.volume) * 1_000_000,
    sparkline: watchlistSparklines[s.ticker] || [s.price, s.price, s.price, s.price, s.price],
  };
});

// ─── Indices (built after allStocksRaw so we can reference tickers) ────
const techTickers = allStocksRaw.filter(s => stockFundamentals[s.ticker].sector === "Technology").map(s => s.ticker);
const mediaTickers = allStocksRaw.filter(s => stockFundamentals[s.ticker].sector === "Media").map(s => s.ticker);
const financeTickers = allStocksRaw.filter(s => stockFundamentals[s.ticker].sector === "Finance").map(s => s.ticker);
const autoTickers = allStocksRaw.filter(s => stockFundamentals[s.ticker].sector === "Automotive").map(s => s.ticker);
const pharmaTickers = allStocksRaw.filter(s => stockFundamentals[s.ticker].sector === "Pharmaceutical").map(s => s.ticker);
const defenseTickers = allStocksRaw.filter(s => stockFundamentals[s.ticker].sector === "Defense").map(s => s.ticker);
const allTickers = allStocksRaw.map(s => s.ticker);

// Top-priced stocks (flagships) for AEON 50.
const aeon50Tickers = [...allStocksRaw].sort((a, b) => b.price - a.price).slice(0, 10).map(s => s.ticker);

// MIDCAP = the SECONDARY-tier tickers from the 19 holdings (second stock per holding in allStocksRaw order).
const midcapTickers: string[] = [];
for (let i = 1; i < allStocksRaw.length; i += 3) midcapTickers.push(allStocksRaw[i].ticker);

export const indices: IndexData[] = [
  { name: "AEON 50", slug: "aeon-50", value: 23519.35, change: 187.45, changePercent: 0.80, sparkline: [23200, 23280, 23350, 23410, 23460, 23500, 23519], description: "The AEON 50 index tracks the top 10 highest-priced flagship companies listed on the MCSE. It is the benchmark index for the exchange.", constituents: aeon50Tickers, chartData: generateIndexChart(23519.35) },
  { name: "AEDEX", slug: "aedex", value: 77478.93, change: 602.75, changePercent: 0.78, sparkline: [76800, 76950, 77100, 77250, 77350, 77420, 77478], description: "The AEDEX is a broad-market index covering all listed stocks on the MCSE, weighted by market capitalisation.", constituents: allTickers, chartData: generateIndexChart(77478.93) },
  { name: "BANKAEON", slug: "bankaeon", value: 50892.15, change: -123.40, changePercent: -0.24, sparkline: [51050, 51010, 50980, 50950, 50920, 50900, 50892], description: "BANKAEON is the financial-sector index tracking companies in banking, financial services, and insurance.", constituents: financeTickers, chartData: generateIndexChart(50892.15) },
  { name: "MIDCAPEON", slug: "midcapeon", value: 11245.60, change: 89.30, changePercent: 0.80, sparkline: [11140, 11160, 11180, 11200, 11220, 11238, 11245], description: "MIDCAPEON tracks mid-cap companies on the MCSE \u2014 the SECONDARY-tier subsidiary of each holding group.", constituents: midcapTickers, chartData: generateIndexChart(11245.60) },
  { name: "FINAEON", slug: "finaeon", value: 23412.80, change: 45.20, changePercent: 0.19, sparkline: [23360, 23370, 23380, 23390, 23400, 23408, 23412], description: "FINAEON covers finance, investment, and advisory companies on the MCSE.", constituents: financeTickers, chartData: generateIndexChart(23412.80) },
  { name: "ITAEON", slug: "itaeon", value: 38642.10, change: 312.80, changePercent: 0.82, sparkline: [38280, 38350, 38420, 38480, 38550, 38610, 38642], description: "ITAEON tracks information technology companies on the MCSE, including software, cloud, AI, and quantum firms.", constituents: techTickers, chartData: generateIndexChart(38642.10) },
  { name: "AUTOAEON", slug: "autoaeon", value: 21834.50, change: -78.60, changePercent: -0.36, sparkline: [21920, 21900, 21880, 21860, 21848, 21840, 21834], description: "AUTOAEON is the automotive-sector index tracking racing, automotive manufacturing, and services companies.", constituents: autoTickers, chartData: generateIndexChart(21834.50) },
  { name: "PHARMAEON", slug: "pharmaeon", value: 17298.40, change: 142.30, changePercent: 0.83, sparkline: [17120, 17150, 17190, 17220, 17255, 17280, 17298], description: "PHARMAEON covers pharmaceutical, medical device, and biotech companies on the MCSE.", constituents: pharmaTickers, chartData: generateIndexChart(17298.40) },
];

export const indexDirectory: Record<string, IndexData> = {};
for (const idx of indices) indexDirectory[idx.slug] = idx;

// Silence unused-variable noise for `mediaTickers` / `defenseTickers` if a tsconfig flag flips on.
void mediaTickers;
void defenseTickers;

// ─── Ticker Tape Data ───────────────────────────────────
const tickerTapeRaw = [
  ...watchlist.map(w => ({ ticker: w.ticker, price: w.price, changePercent: w.dayChangePercent })),
  ...allStocksRaw.map(s => ({ ticker: s.ticker, price: s.price, changePercent: s.changePercent })),
];
const tickerSeen = new Set<string>();
export const tickerTapeItems = tickerTapeRaw.filter(item => {
  if (tickerSeen.has(item.ticker)) return false;
  tickerSeen.add(item.ticker);
  return true;
});

// ─── Order Book ─────────────────────────────────────────
export interface OrderBookLevel {
  price: number;
  qty: number;
  orders: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export function generateOrderBook(basePrice: number): OrderBook {
  const bids: OrderBookLevel[] = [];
  const asks: OrderBookLevel[] = [];
  for (let i = 0; i < 5; i++) {
    bids.push({
      price: +(basePrice - (i + 1) * basePrice * 0.003).toFixed(2),
      qty: Math.floor(50 + Math.random() * 200),
      orders: Math.floor(3 + Math.random() * 15),
    });
    asks.push({
      price: +(basePrice + (i + 1) * basePrice * 0.003).toFixed(2),
      qty: Math.floor(50 + Math.random() * 200),
      orders: Math.floor(3 + Math.random() * 15),
    });
  }
  return { bids, asks };
}

// ─── Enigma Holding Company Admin Data ──────────────────
// Admin dashboard uses this to display the ENIGMA holding view.
export const enigmaCompanyData = {
  ticker: "ENIGMA",
  sharesInCirculation: 50000,
  subsidiaries: ["ESOFT", "ECLOUD", "ENAI"],
  shareholders: [
    { name: "Aditya Verma", shares: 8500, percentage: 17.0 },
    { name: "Riya Sharma", shares: 6200, percentage: 12.4 },
    { name: "Karthik Nair", shares: 5800, percentage: 11.6 },
    { name: "Priya Mehta", shares: 4100, percentage: 8.2 },
    { name: "Arjun Das", shares: 3600, percentage: 7.2 },
    { name: "Sneha Iyer", shares: 2900, percentage: 5.8 },
  ],
  companyNews: [
    { id: "CN-1", title: "Enigma AI wins National Hackathon 2026", content: "Enigma AI's team secured first place at the National Collegiate Hackathon, beating 200+ teams.", timestamp: Date.now() - 86400000 * 2 },
    { id: "CN-2", title: "Enigma Cloud launches new CTF Lab", content: "Enigma Cloud inaugurated a dedicated cybersecurity lab with state-of-the-art infrastructure for CTF competitions.", timestamp: Date.now() - 86400000 * 7 },
    { id: "CN-3", title: "Enigma Software hits 500 open-source PRs", content: "Members contributed over 500 pull requests to major open-source projects during the spring contribution drive.", timestamp: Date.now() - 86400000 * 14 },
  ],
  companyEvents: [
    { id: "CE-1", title: "Annual Hackathon", date: "2026-04-25", type: "EVENT" as const },
    { id: "CE-2", title: "Q1 Results Announcement", date: "2026-05-02", type: "RESULTS" as const },
    { id: "CE-3", title: "Annual General Meeting", date: "2026-05-15", type: "AGM" as const },
  ],
};

// IPO and ETF concepts removed from the platform.
