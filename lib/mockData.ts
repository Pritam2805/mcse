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

export const indices: IndexData[] = [
  { name: "AEON 50", slug: "aeon-50", value: 23519.35, change: 187.45, changePercent: 0.80, sparkline: [23200, 23280, 23350, 23410, 23460, 23500, 23519], description: "The AEON 50 index tracks the 50 largest and most liquid companies listed on the MCSE. It is the benchmark index for the exchange.", constituents: ["ENAI", "ECLOUD", "CELBIO", "MTEK", "CELENR", "ESOFT", "GMAUTO", "MSMEDIA", "MACAD", "MSSTD"], chartData: generateIndexChart(23519.35) },
  { name: "AEDEX", slug: "aedex", value: 77478.93, change: 602.75, changePercent: 0.78, sparkline: [76800, 76950, 77100, 77250, 77350, 77420, 77478], description: "The AEDEX is a broad-market index covering all listed stocks on the MCSE, weighted by market capitalisation.", constituents: ["ENAI", "ECLOUD", "CELBIO", "MTEK", "CELENR", "ESOFT", "GMAUTO", "MSMEDIA", "MACAD", "CELRES", "ERLAB", "MSSTD", "GMRACE", "ERPRESS", "MSDIGI", "MPUB", "ERLEARN", "GMSERV", "INMKT", "INDATA", "INCON"], chartData: generateIndexChart(77478.93) },
  { name: "BANKAEON", slug: "bankaeon", value: 50892.15, change: -123.40, changePercent: -0.24, sparkline: [51050, 51010, 50980, 50950, 50920, 50900, 50892], description: "BANKAEON is the financial-sector index tracking companies in banking, financial services, and insurance.", constituents: ["INDATA", "INMKT", "INCON"], chartData: generateIndexChart(50892.15) },
  { name: "MIDCAPEON", slug: "midcapeon", value: 11245.60, change: 89.30, changePercent: 0.80, sparkline: [11140, 11160, 11180, 11200, 11220, 11238, 11245], description: "MIDCAPEON tracks mid-cap companies on the MCSE — those ranked 11th to 21st by market capitalisation.", constituents: ["CELRES", "ERLAB", "MSSTD", "GMRACE", "ERPRESS", "MSDIGI", "MPUB", "ERLEARN", "GMSERV", "INMKT", "INDATA"], chartData: generateIndexChart(11245.60) },
  { name: "FINAEON", slug: "finaeon", value: 23412.80, change: 45.20, changePercent: 0.19, sparkline: [23360, 23370, 23380, 23390, 23400, 23408, 23412], description: "FINAEON is the financial analytics index, covering data, consulting, and market research firms on the MCSE.", constituents: ["INDATA", "INMKT", "INCON"], chartData: generateIndexChart(23412.80) },
  { name: "ITAEON", slug: "itaeon", value: 38642.10, change: 312.80, changePercent: 0.82, sparkline: [38280, 38350, 38420, 38480, 38550, 38610, 38642], description: "ITAEON tracks information technology companies on the MCSE, including software, cloud, and AI firms.", constituents: ["ENAI", "ECLOUD", "ESOFT", "MTEK"], chartData: generateIndexChart(38642.10) },
  { name: "AUTOAEON", slug: "autoaeon", value: 21834.50, change: -78.60, changePercent: -0.36, sparkline: [21920, 21900, 21880, 21860, 21848, 21840, 21834], description: "AUTOAEON is the automotive-sector index tracking racing, automotive manufacturing, and services companies.", constituents: ["GMAUTO", "GMRACE", "GMSERV"], chartData: generateIndexChart(21834.50) },
  { name: "PHARMAEON", slug: "pharmaeon", value: 17298.40, change: 142.30, changePercent: 0.83, sparkline: [17120, 17150, 17190, 17220, 17255, 17280, 17298], description: "PHARMAEON covers science, research, and biotech companies on the MCSE.", constituents: ["CELBIO", "CELRES", "CELENR", "ERLAB"], chartData: generateIndexChart(17298.40) },
];

export const indexDirectory: Record<string, IndexData> = {};
for (const idx of indices) indexDirectory[idx.slug] = idx;

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
    ticker: "MATHSOC",
    name: "Math Society Group",
    about: "Math Society is the flagship mathematics club of the institution. As a holding company it oversees its three subsidiaries: MathSoc Academy (education), MathSoc Publishing (academic publishing), and MathSoc Tech (edtech solutions).",
    subsidiaries: ["MACAD", "MPUB", "MTEK"],
    totalEmployees: 240,
    logoLetter: "M",
    founded: "2018",
  },
  {
    ticker: "ENIGMA",
    name: "Enigma Group",
    about: "Enigma is the premier computer science and coding club. As a holding company it manages Enigma Software (development), Enigma Cloud (cloud services), and Enigma AI (artificial intelligence research).",
    subsidiaries: ["ESOFT", "ECLOUD", "ENAI"],
    totalEmployees: 310,
    logoLetter: "E",
    founded: "2017",
  },
  {
    ticker: "GASMONKEYS",
    name: "Gas Monkeys Group",
    about: "Gas Monkeys is the automotive and mechanical engineering club. The holding company oversees GM Racing (racing events), GM Automotive (parts manufacturing), and GM Services (maintenance and repair).",
    subsidiaries: ["GMRACE", "GMAUTO", "GMSERV"],
    totalEmployees: 180,
    logoLetter: "G",
    founded: "2019",
  },
  {
    ticker: "MASTERSHOT",
    name: "MasterShot Group",
    about: "MasterShot is the media and entertainment society. The holding company manages MS Studios (film production), MS Digital (digital content), and MS Media (media distribution).",
    subsidiaries: ["MSSTD", "MSDIGI", "MSMEDIA"],
    totalEmployees: 220,
    logoLetter: "S",
    founded: "2018",
  },
  {
    ticker: "ERUDITE",
    name: "Erudite Group",
    about: "Erudite is the literary and general knowledge society. The holding company oversees Erudite Learn (learning platform), Erudite Press (publishing house), and Erudite Labs (research division).",
    subsidiaries: ["ERLEARN", "ERPRESS", "ERLAB"],
    totalEmployees: 195,
    logoLetter: "R",
    founded: "2017",
  },
  {
    ticker: "INSIGHT",
    name: "Insight Group",
    about: "Insight is the data analytics and business intelligence club. The holding company manages Insight Data (analytics), Insight Markets (market research), and Insight Consulting (advisory services).",
    subsidiaries: ["INDATA", "INMKT", "INCON"],
    totalEmployees: 165,
    logoLetter: "I",
    founded: "2020",
  },
  {
    ticker: "CELESTE",
    name: "Celeste Group",
    about: "Celeste is the astronomy and space science research club. The holding company oversees Celeste Research (space research), Celeste Energy (clean energy), and Celeste BioSystems (biotechnology).",
    subsidiaries: ["CELRES", "CELENR", "CELBIO"],
    totalEmployees: 275,
    logoLetter: "C",
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
  currentValue: 487693.69,
  investedValue: 421500.0,
  totalReturns: 66193.69,
  totalReturnsPercent: 15.71,
  dayReturns: 2847.30,
  dayReturnsPercent: 0.59,
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

export const holdings: Holding[] = [
  {
    ticker: "MACAD",
    name: "MathSoc Academy",
    qty: 50,
    avgPrice: 980.0,
    currentPrice: 1198.50,
    dayChange: 14.30,
    dayChangePercent: 1.21,
    returns: 10925.0,
    returnsPercent: 22.30,
    currentValue: 59925.0,
    investedValue: 49000.0,
    sparkline: [1170, 1178, 1182, 1186, 1190, 1195, 1198],
  },
  {
    ticker: "ECLOUD",
    name: "Enigma Cloud",
    qty: 10,
    avgPrice: 2780.0,
    currentPrice: 3215.40,
    dayChange: -18.60,
    dayChangePercent: -0.58,
    returns: 4354.0,
    returnsPercent: 15.66,
    currentValue: 32154.0,
    investedValue: 27800.0,
    sparkline: [3240, 3230, 3225, 3220, 3218, 3216, 3215],
  },
  {
    ticker: "GMAUTO",
    name: "GM Automotive",
    qty: 30,
    avgPrice: 1180.0,
    currentPrice: 1456.20,
    dayChange: 17.40,
    dayChangePercent: 1.21,
    returns: 8286.0,
    returnsPercent: 23.41,
    currentValue: 43686.0,
    investedValue: 35400.0,
    sparkline: [1425, 1430, 1436, 1440, 1448, 1453, 1456],
  },
  {
    ticker: "MSSTD",
    name: "MS Studios",
    qty: 40,
    avgPrice: 880.0,
    currentPrice: 1087.30,
    dayChange: 8.10,
    dayChangePercent: 0.75,
    returns: 8292.0,
    returnsPercent: 23.56,
    currentValue: 43492.0,
    investedValue: 35200.0,
    sparkline: [1070, 1074, 1078, 1080, 1083, 1085, 1087],
  },
  {
    ticker: "ERLEARN",
    name: "Erudite Learn",
    qty: 80,
    avgPrice: 490.0,
    currentPrice: 618.70,
    dayChange: -4.90,
    dayChangePercent: -0.79,
    returns: 10296.0,
    returnsPercent: 26.27,
    currentValue: 49496.0,
    investedValue: 39200.0,
    sparkline: [625, 623, 621, 620, 619, 619, 618],
  },
  {
    ticker: "INDATA",
    name: "Insight Data",
    qty: 150,
    avgPrice: 215.0,
    currentPrice: 282.45,
    dayChange: 3.30,
    dayChangePercent: 1.18,
    returns: 10117.5,
    returnsPercent: 31.37,
    currentValue: 42367.5,
    investedValue: 32250.0,
    sparkline: [275, 277, 278, 279, 280, 281, 282],
  },
  {
    ticker: "CELBIO",
    name: "Celeste Bio",
    qty: 15,
    avgPrice: 1780.0,
    currentPrice: 2148.60,
    dayChange: 38.20,
    dayChangePercent: 1.81,
    returns: 5529.0,
    returnsPercent: 20.71,
    currentValue: 32229.0,
    investedValue: 26700.0,
    sparkline: [2100, 2110, 2118, 2128, 2135, 2142, 2148],
  },
];

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

export const watchlist: WatchlistStock[] = [
  {
    ticker: "MTEK",
    name: "MathSoc Tech",
    shares: 20,
    price: 2112.80,
    dayChange: 25.40,
    dayChangePercent: 1.22,
    volume: "6.8M",
    w52Low: 1450,
    w52High: 2350,
    sparkline: [2080, 2085, 2090, 2095, 2100, 2108, 2112],
  },
  {
    ticker: "ESOFT",
    name: "Enigma Software",
    shares: 35,
    price: 1842.90,
    dayChange: -10.30,
    dayChangePercent: -0.56,
    volume: "8.2M",
    w52Low: 1280,
    w52High: 2100,
    sparkline: [1855, 1852, 1848, 1846, 1844, 1843, 1842],
  },
  {
    ticker: "ENAI",
    name: "Enigma AI",
    shares: 8,
    price: 4512.60,
    dayChange: 62.80,
    dayChangePercent: 1.41,
    volume: "4.1M",
    w52Low: 2900,
    w52High: 4800,
    sparkline: [4440, 4455, 4470, 4485, 4495, 4505, 4512],
  },
  {
    ticker: "MSDIGI",
    name: "MS Digital",
    price: 785.40,
    dayChange: 5.60,
    dayChangePercent: 0.72,
    volume: "9.4M",
    w52Low: 520,
    w52High: 860,
    sparkline: [776, 778, 780, 781, 783, 784, 785],
  },
  {
    ticker: "CELRES",
    name: "Celeste Research",
    shares: 12,
    price: 984.20,
    dayChange: 12.40,
    dayChangePercent: 1.28,
    volume: "5.5M",
    w52Low: 650,
    w52High: 1080,
    sparkline: [968, 972, 975, 978, 980, 982, 984],
  },
  {
    ticker: "ERPRESS",
    name: "Erudite Press",
    price: 342.10,
    dayChange: 4.90,
    dayChangePercent: 1.45,
    volume: "11.2M",
    w52Low: 210,
    w52High: 380,
    sparkline: [335, 336, 337, 339, 340, 341, 342],
  },
  {
    ticker: "GMRACE",
    name: "GM Racing",
    price: 892.30,
    dayChange: -6.70,
    dayChangePercent: -0.74,
    volume: "7.3M",
    w52Low: 580,
    w52High: 980,
    sparkline: [900, 898, 896, 895, 893, 893, 892],
  },
];

// ─── Most Traded ────────────────────────────────────────
export interface MostTradedStock {
  ticker: string;
  name: string;
  price: number;
  dayChange: number;
  dayChangePercent: number;
}

export const mostTraded: MostTradedStock[] = [
  { ticker: "MACAD", name: "MathSoc Academy", price: 1198.50, dayChange: 14.30, dayChangePercent: 1.21 },
  { ticker: "ECLOUD", name: "Enigma Cloud", price: 3215.40, dayChange: -18.60, dayChangePercent: -0.58 },
  { ticker: "MSSTD", name: "MS Studios", price: 1087.30, dayChange: 8.10, dayChangePercent: 0.75 },
  { ticker: "INDATA", name: "Insight Data", price: 282.45, dayChange: 3.30, dayChangePercent: 1.18 },
];

// ─── Top Movers ─────────────────────────────────────────
export interface MoverStock {
  ticker: string;
  name: string;
  price: number;
  dayChangePercent: number;
  volume: string;
  sparkline: number[];
}

export const topGainers: MoverStock[] = [
  { ticker: "CELBIO", name: "Celeste Bio", price: 2148.60, dayChangePercent: 1.81, volume: "6.2M", sparkline: [2100, 2110, 2118, 2128, 2135, 2142, 2148] },
  { ticker: "ERPRESS", name: "Erudite Press", price: 342.10, dayChangePercent: 1.45, volume: "11.2M", sparkline: [335, 336, 337, 339, 340, 341, 342] },
  { ticker: "ENAI", name: "Enigma AI", price: 4512.60, dayChangePercent: 1.41, volume: "4.1M", sparkline: [4440, 4455, 4470, 4485, 4495, 4505, 4512] },
  { ticker: "CELRES", name: "Celeste Research", price: 984.20, dayChangePercent: 1.28, volume: "5.5M", sparkline: [968, 972, 975, 978, 980, 982, 984] },
  { ticker: "MTEK", name: "MathSoc Tech", price: 2112.80, dayChangePercent: 1.22, volume: "6.8M", sparkline: [2080, 2085, 2090, 2095, 2100, 2108, 2112] },
  { ticker: "MACAD", name: "MathSoc Academy", price: 1198.50, dayChangePercent: 1.21, volume: "9.4M", sparkline: [1170, 1178, 1182, 1186, 1190, 1195, 1198] },
  { ticker: "GMAUTO", name: "GM Automotive", price: 1456.20, dayChangePercent: 1.21, volume: "8.8M", sparkline: [1425, 1430, 1436, 1440, 1448, 1453, 1456] },
  { ticker: "INDATA", name: "Insight Data", price: 282.45, dayChangePercent: 1.18, volume: "15.3M", sparkline: [275, 277, 278, 279, 280, 281, 282] },
];

export const topLosers: MoverStock[] = [
  { ticker: "ERLEARN", name: "Erudite Learn", price: 618.70, dayChangePercent: -0.79, volume: "10.1M", sparkline: [625, 623, 621, 620, 619, 619, 618] },
  { ticker: "GMRACE", name: "GM Racing", price: 892.30, dayChangePercent: -0.74, volume: "7.3M", sparkline: [900, 898, 896, 895, 893, 893, 892] },
  { ticker: "ECLOUD", name: "Enigma Cloud", price: 3215.40, dayChangePercent: -0.58, volume: "5.4M", sparkline: [3240, 3230, 3225, 3220, 3218, 3216, 3215] },
  { ticker: "ESOFT", name: "Enigma Software", price: 1842.90, dayChangePercent: -0.56, volume: "8.2M", sparkline: [1855, 1852, 1848, 1846, 1844, 1843, 1842] },
  { ticker: "GMSERV", name: "GM Services", price: 562.80, dayChangePercent: -0.44, volume: "6.1M", sparkline: [566, 565, 564, 564, 563, 563, 562] },
  { ticker: "INMKT", name: "Insight Markets", price: 428.90, dayChangePercent: -0.35, volume: "7.8M", sparkline: [432, 431, 430, 430, 429, 429, 428] },
];

export const volumeShockers: MoverStock[] = [
  { ticker: "INDATA", name: "Insight Data", price: 282.45, dayChangePercent: 1.18, volume: "15.3M", sparkline: [275, 277, 278, 279, 280, 281, 282] },
  { ticker: "ERPRESS", name: "Erudite Press", price: 342.10, dayChangePercent: 1.45, volume: "11.2M", sparkline: [335, 336, 337, 339, 340, 341, 342] },
  { ticker: "ERLEARN", name: "Erudite Learn", price: 618.70, dayChangePercent: -0.79, volume: "10.1M", sparkline: [625, 623, 621, 620, 619, 619, 618] },
  { ticker: "MACAD", name: "MathSoc Academy", price: 1198.50, dayChangePercent: 1.21, volume: "9.4M", sparkline: [1170, 1178, 1182, 1186, 1190, 1195, 1198] },
  { ticker: "MSDIGI", name: "MS Digital", price: 785.40, dayChangePercent: 0.72, volume: "9.4M", sparkline: [776, 778, 780, 781, 783, 784, 785] },
  { ticker: "GMAUTO", name: "GM Automotive", price: 1456.20, dayChangePercent: 1.21, volume: "8.8M", sparkline: [1425, 1430, 1436, 1440, 1448, 1453, 1456] },
];

// ─── Market Breadth ─────────────────────────────────────
export const marketBreadth = {
  advances: 1247,
  declines: 892,
  unchanged: 61,
};

// ─── Products & Tools ───────────────────────────────────
export const productsAndTools = [
  { label: "IPO", icon: "target", description: "Apply to upcoming initial public offerings" },
  { label: "BONDS", icon: "landmark", description: "Fixed-income securities for steady returns" },
  { label: "ETFs", icon: "layers", description: "Exchange-traded funds across sectors" },
  { label: "INTRADAY SCREENER", icon: "scan", description: "Filter stocks by technical signals" },
  { label: "STOCKS SIP", icon: "repeat", description: "Systematic investment plans for stocks" },
  { label: "MTF STOCKS", icon: "trending-up", description: "Margin trading facility stocks" },
  { label: "EVENTS CALENDAR", icon: "calendar", description: "Track corporate events and results" },
];

// ─── Ticker Tape Data ───────────────────────────────────
const tickerTapeRaw = [
  ...holdings.map(h => ({ ticker: h.ticker, price: h.currentPrice, changePercent: h.dayChangePercent })),
  ...watchlist.map(w => ({ ticker: w.ticker, price: w.price, changePercent: w.dayChangePercent })),
];
// Deduplicate by ticker — holdings take priority
const tickerSeen = new Set<string>();
export const tickerTapeItems = tickerTapeRaw.filter(item => {
  if (tickerSeen.has(item.ticker)) return false;
  tickerSeen.add(item.ticker);
  return true;
});

// ─── User Profile ───────────────────────────────────────
export const userProfile = {
  name: "Deepak Aeleni",
  email: "aeleni@mcse.in",
  balance: 693.69,
  joined: "Mar 2024",
  phone: "+91 98765 43210",
  kycStatus: "VERIFIED",
};

// ─── Portfolio Analysis ─────────────────────────────────
export const portfolioAnalysis = {
  currentValue: 487693.69,
  investedValue: 421500.0,
  totalReturns: 66193.69,
  totalReturnsPercent: 15.71,
  eventReturnPct: 13.29,
  benchmarkName: "AEON 50",
  benchmarkAeon50Pct: 2.40,
  alphaPct: 10.89,
  sectorAllocation: [
    { sector: "Education", value: 28.0 },
    { sector: "Technology", value: 18.5 },
    { sector: "Automotive", value: 14.4 },
    { sector: "Media & Entertainment", value: 14.4 },
    { sector: "Analytics", value: 14.0 },
    { sector: "Science & Research", value: 10.7 },
  ],
  marketCapAllocation: [
    { cap: "Large Cap", value: 34.6 },
    { cap: "Mid Cap", value: 49.3 },
    { cap: "Small Cap", value: 16.1 },
  ],
  performanceChart: [
    { month: "Apr", portfolio: 421500, benchmark: 421500 },
    { month: "May", portfolio: 428200, benchmark: 423800 },
    { month: "Jun", portfolio: 435800, benchmark: 425100 },
    { month: "Jul", portfolio: 441200, benchmark: 428200 },
    { month: "Aug", portfolio: 438600, benchmark: 426900 },
    { month: "Sep", portfolio: 449800, benchmark: 429300 },
    { month: "Oct", portfolio: 458900, benchmark: 431200 },
    { month: "Nov", portfolio: 465200, benchmark: 428700 },
    { month: "Dec", portfolio: 472100, benchmark: 430100 },
    { month: "Jan", portfolio: 478800, benchmark: 429800 },
    { month: "Feb", portfolio: 482400, benchmark: 431500 },
    { month: "Mar", portfolio: 487693, benchmark: 431600 },
  ],
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

export const newsItems: NewsItem[] = [
  {
    ticker: "MACAD",
    name: "MathSoc Academy",
    headline: "MathSoc Academy announces annual inter-college competition with record participation expected from 45+ colleges. Prize pool increased to \u20B950,000.",
    body: "MathSoc Academy has officially opened registrations for the 2026 edition of its flagship inter-college mathematics competition, MathBattle. This year's event is expected to draw participants from over 45 colleges across the region — a 50% increase from last year's turnout.\n\nThe prize pool has been raised to \u20B950,000, with the top three teams receiving cash awards and internship opportunities with partnered EdTech firms. The competition will feature four rounds: a qualifying online test, a speed-math round, a team-based problem-solving relay, and a final face-off.\n\n\"We've restructured the format to make it more inclusive for first-year students,\" said Rohan Mehra, President of MathSoc Academy. \"We want to identify talent early and give them a platform to shine.\"\n\nRegistrations close on April 22, with the main event scheduled across April 24–26 during the MCSE trading window.",
    timestamp: Date.now() - 6 * 60 * 1000,
    price: 1198.50,
    dayChange: 14.30,
    dayChangePercent: 1.21,
  },
  {
    ticker: "ECLOUD",
    name: "Enigma Cloud",
    headline: "Enigma Cloud completes migration of campus services to its own infrastructure, reducing latency by 40% across all applications.",
    body: "Enigma Cloud has successfully completed the migration of all major campus applications to its self-managed cloud infrastructure, marking a significant milestone in the club's technical roadmap.\n\nThe migration, which took three months, covered the college's event management platform, attendance tracking system, and collaborative development environments. Early benchmarks show a 40% reduction in average response times and 99.8% uptime since the switch.\n\n\"We were running on shared hosting with unpredictable performance,\" explained Ananya Krishnan, Enigma Cloud's lead architect. \"Now we have full control over scaling, monitoring, and security. It's a fundamentally different experience for end users.\"\n\nThe infrastructure is built on containerised microservices with automated failover. Enigma Cloud plans to open its platform to other college clubs as a managed hosting service by the end of the semester.",
    timestamp: Date.now() - 23 * 60 * 1000,
    price: 3215.40,
    dayChange: -18.60,
    dayChangePercent: -0.58,
  },
  {
    ticker: "GMAUTO",
    name: "GM Automotive",
    headline: "GM Automotive secures sponsorship deal with leading automotive brand for their flagship racing event this April.",
    body: "GM Automotive has announced a headline sponsorship agreement with a nationally recognised automotive parts manufacturer for the upcoming Grand Prix event scheduled during the MCSE trading days.\n\nThe sponsorship, valued at an undisclosed sum, will cover event logistics, safety equipment upgrades, and a live-streamed broadcast of the race. In return, the sponsor will have branding rights across the event venue and all promotional materials.\n\n\"This is the biggest sponsorship deal Gas Monkeys has ever secured,\" said Vikram Joshi, head of GM Automotive. \"It validates the quality of our engineering and the professionalism of our events.\"\n\nThe Grand Prix will feature both petrol and electric vehicle categories, with teams from eight colleges confirmed to participate. GM Racing, a sibling subsidiary, will field two cars in the competition.",
    timestamp: Date.now() - 2 * 3600 * 1000,
    price: 1456.20,
    dayChange: 17.40,
    dayChangePercent: 1.21,
  },
  {
    ticker: "CELBIO",
    name: "Celeste Bio",
    headline: "Celeste Bio publishes breakthrough findings on algae-based biofuels in a top-tier research journal. Patent filing expected soon.",
    body: "Celeste BioSystems has published a peer-reviewed paper in the Journal of Sustainable Biotechnology detailing a novel method for extracting biofuel from freshwater algae with 30% higher yield than existing techniques.\n\nThe research, led by Dr. Meera Subramaniam and a team of six undergraduate researchers, uses a proprietary enzymatic process that reduces extraction time from 72 hours to under 18 hours. The team has filed a provisional patent application.\n\n\"This could fundamentally change how campus-scale biofuel production works,\" said Dr. Subramaniam. \"We're already in discussions with two clean-energy incubators about pilot programmes.\"\n\nCeleste Bio's stock has seen increased interest following the announcement, with trading volume up 35% over the past week. The company's parent, Celeste Group, has allocated additional lab space and funding for Phase 2 trials.",
    timestamp: Date.now() - 5 * 3600 * 1000,
    price: 2148.60,
    dayChange: 38.20,
    dayChangePercent: 1.81,
  },
  {
    ticker: "ENAI",
    name: "Enigma AI",
    headline: "Enigma AI lab unveils a new open-source language model trained on college curriculum data, attracting interest from EdTech startups.",
    body: "Enigma AI's research lab has released CampusLM, an open-source language model fine-tuned on structured curriculum data from over 200 college courses. The model is designed to assist students with concept explanations, problem generation, and study planning.\n\nCampusLM was trained using a custom pipeline built on top of open foundation models, with reinforcement learning from human feedback provided by 50+ student volunteers across three departments.\n\n\"Existing LLMs are great for general knowledge, but they hallucinate on domain-specific academic content,\" said Arjun Reddy, Enigma AI's project lead. \"CampusLM is grounded in verified syllabi and textbook content.\"\n\nThe model has already attracted interest from two EdTech startups looking to integrate it into their platforms. Enigma AI plans to offer a hosted API for campus applications and is exploring a partnership with MathSoc Tech for a mathematics-specific variant.",
    timestamp: Date.now() - 8 * 3600 * 1000,
    price: 4512.60,
    dayChange: 62.80,
    dayChangePercent: 1.41,
  },
  {
    ticker: "ERPRESS",
    name: "Erudite Press",
    headline: "Erudite Press quarterly magazine reaches 10,000 subscribers milestone. Digital edition now available on campus app.",
    body: "Erudite Press has crossed the 10,000-subscriber mark for its flagship quarterly publication, 'The Erudite Review', making it the most widely read student-run magazine on campus.\n\nThe milestone was reached following the launch of a digital edition accessible through the campus mobile app, which added 3,200 subscribers in the past quarter alone. The digital version features interactive essays, embedded audio readings, and a community discussion section.\n\n\"Print will always be our identity, but digital is how we grow,\" said Kavya Iyer, Editor-in-Chief of Erudite Press. \"The new format lets us include multimedia features that print simply can't support.\"\n\nThe next issue, themed 'Futures', will coincide with the MCSE trading event and will include profiles of all seven parent companies listed on the exchange. Erudite Press is also piloting a writer-in-residence fellowship that will be funded partly through magazine revenue.",
    timestamp: Date.now() - 12 * 3600 * 1000,
    price: 342.10,
    dayChange: 4.90,
    dayChangePercent: 1.45,
  },
];

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
    const drift = Math.abs(m - 30) / 30; // mean-revert towards end
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
  // ── MATHSOC Group ─────────────────────
  { ticker: "MACAD", name: "MathSoc Academy", price: 1198.50, changePercent: 1.21, parentCompany: "MATHSOC", about: "MathSoc Academy is the education arm of Math Society Group, running coaching programmes, olympiad prep courses, and inter-college quiz competitions. With 500+ enrolled students, it is the largest maths education platform on campus." },
  { ticker: "MPUB", name: "MathSoc Publishing", price: 685.20, changePercent: 0.64, parentCompany: "MATHSOC", about: "MathSoc Publishing produces academic journals, problem sets, and reference books used across 30+ colleges. Its quarterly journal 'Proof' is considered the gold standard for collegiate mathematics publications." },
  { ticker: "MTEK", name: "MathSoc Tech", price: 2112.80, changePercent: 1.22, parentCompany: "MATHSOC", about: "MathSoc Tech builds edtech tools including an adaptive problem-solving platform, a LaTeX collaboration editor, and gamified learning apps. Its products serve 2,000+ daily active users." },
  // ── ENIGMA Group ──────────────────────
  { ticker: "ESOFT", name: "Enigma Software", price: 1842.90, changePercent: -0.56, parentCompany: "ENIGMA", about: "Enigma Software is the development wing of Enigma Group, specialising in open-source projects, competitive programming tools, and campus utility apps. Members have contributed 500+ PRs to major OSS projects." },
  { ticker: "ECLOUD", name: "Enigma Cloud", price: 3215.40, changePercent: -0.58, parentCompany: "ENIGMA", about: "Enigma Cloud provides cloud infrastructure and hosting services for campus applications. It manages the college's event platform, attendance systems, and collaborative dev environments." },
  { ticker: "ENAI", name: "Enigma AI", price: 4512.60, changePercent: 1.41, parentCompany: "ENIGMA", about: "Enigma AI is the artificial intelligence research lab of Enigma Group. It builds ML models for campus analytics, runs AI workshops, and has published papers at collegiate AI conferences." },
  // ── GASMONKEYS Group ──────────────────
  { ticker: "GMRACE", name: "GM Racing", price: 892.30, changePercent: -0.74, parentCompany: "GASMONKEYS", about: "GM Racing is the competitive motorsport division of Gas Monkeys Group. The team builds go-karts and electric vehicles for national-level racing events, with multiple podium finishes." },
  { ticker: "GMAUTO", name: "GM Automotive", price: 1456.20, changePercent: 1.21, parentCompany: "GASMONKEYS", about: "GM Automotive designs and fabricates custom automotive components and aftermarket parts. The workshop serves the campus fleet and external clients with precision machining." },
  { ticker: "GMSERV", name: "GM Services", price: 562.80, changePercent: -0.44, parentCompany: "GASMONKEYS", about: "GM Services provides maintenance, repair, and technical consultation for campus vehicles and equipment. It runs a fully equipped service bay and a mobile repair unit." },
  // ── MASTERSHOT Group ──────────────────
  { ticker: "MSSTD", name: "MS Studios", price: 1087.30, changePercent: 0.75, parentCompany: "MASTERSHOT", about: "MS Studios is the film production division of MasterShot Group. It produces short films, documentaries, and covers all major campus events. Its annual film festival attracts entries from 50+ colleges." },
  { ticker: "MSDIGI", name: "MS Digital", price: 785.40, changePercent: 0.72, parentCompany: "MASTERSHOT", about: "MS Digital handles digital content creation — podcasts, social media campaigns, and digital marketing for campus organisations. It manages 15+ social channels with 100K+ combined followers." },
  { ticker: "MSMEDIA", name: "MS Media", price: 1352.70, changePercent: 0.48, parentCompany: "MASTERSHOT", about: "MS Media is the distribution and broadcasting arm of MasterShot Group. It operates the campus streaming platform, manages rights licensing, and runs the college radio station." },
  // ── ERUDITE Group ─────────────────────
  { ticker: "ERLEARN", name: "Erudite Learn", price: 618.70, changePercent: -0.79, parentCompany: "ERUDITE", about: "Erudite Learn is the online learning platform of Erudite Group, offering courses in debate, public speaking, and critical thinking. It hosts weekly workshops and Model UN preparation sessions." },
  { ticker: "ERPRESS", name: "Erudite Press", price: 342.10, changePercent: 1.45, parentCompany: "ERUDITE", about: "Erudite Press is the publishing house of Erudite Group. It publishes a quarterly literary magazine, curates the campus book exchange programme, and runs a writer-in-residence fellowship." },
  { ticker: "ERLAB", name: "Erudite Labs", price: 891.50, changePercent: 0.82, parentCompany: "ERUDITE", about: "Erudite Labs is the research division of Erudite Group, conducting studies in linguistics, cognitive science, and educational psychology. It has published 12 papers in peer-reviewed journals." },
  // ── INSIGHT Group ─────────────────────
  { ticker: "INDATA", name: "Insight Data", price: 282.45, changePercent: 1.18, parentCompany: "INSIGHT", about: "Insight Data is the analytics arm of Insight Group, building dashboards, running data competitions, and providing pro-bono data consulting to startups and NGOs on campus." },
  { ticker: "INMKT", name: "Insight Markets", price: 428.90, changePercent: -0.35, parentCompany: "INSIGHT", about: "Insight Markets conducts market research and consumer behaviour studies for campus businesses. It publishes the bi-monthly 'Campus Pulse' report tracking student spending trends." },
  { ticker: "INCON", name: "Insight Consulting", price: 192.40, changePercent: 0.94, parentCompany: "INSIGHT", about: "Insight Consulting offers advisory services to student-run startups and college clubs. It has advised on 30+ business plans and helped secure \u20B92L+ in seed funding for campus ventures." },
  // ── CELESTE Group ─────────────────────
  { ticker: "CELRES", name: "Celeste Research", price: 984.20, changePercent: 1.28, parentCompany: "CELESTE", about: "Celeste Research is the space science division of Celeste Group, operating the campus observatory and contributing to citizen science projects. It has published observational data in international journals." },
  { ticker: "CELENR", name: "Celeste Energy", price: 1542.80, changePercent: 0.95, parentCompany: "CELESTE", about: "Celeste Energy focuses on clean energy research — solar panel optimisation, wind tunnel experiments, and campus sustainability initiatives. It reduced campus energy costs by 12% last year." },
  { ticker: "CELBIO", name: "Celeste Bio", price: 2148.60, changePercent: 1.81, parentCompany: "CELESTE", about: "Celeste BioSystems is the biotechnology arm of Celeste Group, conducting research in algae-based biofuels, water purification, and bioinformatics. Three patents pending for novel purification methods." },
];

const stockFundamentals: Record<string, StockFundamentals> = {
  // MATHSOC subs
  MACAD:  { marketCap: "6.0Cr", pe: 24.8, eps: 48.33, bookValue: 820.0, roe: 17.6, w52High: 1380.0, w52Low: 780.0, volume: "9.4M", avgVolume: "7.8M", sector: "Education" },
  MPUB:   { marketCap: "3.4Cr", pe: 18.2, eps: 37.65, bookValue: 480.0, roe: 14.2, w52High: 760.0, w52Low: 420.0, volume: "5.2M", avgVolume: "4.6M", sector: "Education" },
  MTEK:   { marketCap: "10.6Cr", pe: 32.6, eps: 64.81, bookValue: 1540.0, roe: 20.8, w52High: 2350.0, w52Low: 1450.0, volume: "6.8M", avgVolume: "5.4M", sector: "Technology" },
  // ENIGMA subs
  ESOFT:  { marketCap: "9.2Cr", pe: 28.4, eps: 64.89, bookValue: 1280.0, roe: 21.2, w52High: 2100.0, w52Low: 1280.0, volume: "8.2M", avgVolume: "7.1M", sector: "Technology" },
  ECLOUD: { marketCap: "16.1Cr", pe: 36.8, eps: 87.37, bookValue: 2200.0, roe: 23.5, w52High: 3600.0, w52Low: 2150.0, volume: "5.4M", avgVolume: "4.8M", sector: "Technology" },
  ENAI:   { marketCap: "22.6Cr", pe: 42.1, eps: 107.19, bookValue: 3100.0, roe: 25.8, w52High: 4800.0, w52Low: 2900.0, volume: "4.1M", avgVolume: "3.6M", sector: "Technology" },
  // GASMONKEYS subs
  GMRACE: { marketCap: "4.5Cr", pe: 16.2, eps: 55.08, bookValue: 620.0, roe: 13.8, w52High: 980.0, w52Low: 580.0, volume: "7.3M", avgVolume: "6.2M", sector: "Automotive" },
  GMAUTO: { marketCap: "7.3Cr", pe: 19.4, eps: 75.06, bookValue: 980.0, roe: 16.2, w52High: 1620.0, w52Low: 920.0, volume: "8.8M", avgVolume: "7.4M", sector: "Automotive" },
  GMSERV: { marketCap: "2.8Cr", pe: 12.8, eps: 43.97, bookValue: 380.0, roe: 11.4, w52High: 640.0, w52Low: 350.0, volume: "6.1M", avgVolume: "5.2M", sector: "Automotive" },
  // MASTERSHOT subs
  MSSTD:  { marketCap: "5.4Cr", pe: 22.6, eps: 48.11, bookValue: 740.0, roe: 17.8, w52High: 1240.0, w52Low: 720.0, volume: "6.5M", avgVolume: "5.6M", sector: "Media & Entertainment" },
  MSDIGI: { marketCap: "3.9Cr", pe: 17.4, eps: 45.14, bookValue: 540.0, roe: 15.2, w52High: 860.0, w52Low: 520.0, volume: "9.4M", avgVolume: "8.1M", sector: "Media & Entertainment" },
  MSMEDIA:{ marketCap: "6.8Cr", pe: 26.2, eps: 51.63, bookValue: 920.0, roe: 18.6, w52High: 1520.0, w52Low: 880.0, volume: "4.8M", avgVolume: "4.2M", sector: "Media & Entertainment" },
  // ERUDITE subs
  ERLEARN:{ marketCap: "3.1Cr", pe: 15.8, eps: 39.16, bookValue: 420.0, roe: 16.4, w52High: 720.0, w52Low: 380.0, volume: "10.1M", avgVolume: "8.6M", sector: "Education" },
  ERPRESS:{ marketCap: "1.7Cr", pe: 11.4, eps: 30.01, bookValue: 240.0, roe: 19.2, w52High: 380.0, w52Low: 210.0, volume: "11.2M", avgVolume: "9.4M", sector: "Education" },
  ERLAB:  { marketCap: "4.5Cr", pe: 21.8, eps: 40.90, bookValue: 620.0, roe: 18.8, w52High: 1020.0, w52Low: 580.0, volume: "5.8M", avgVolume: "4.9M", sector: "Science & Research" },
  // INSIGHT subs
  INDATA: { marketCap: "1.4Cr", pe: 10.8, eps: 26.15, bookValue: 195.0, roe: 22.4, w52High: 320.0, w52Low: 175.0, volume: "15.3M", avgVolume: "12.8M", sector: "Analytics" },
  INMKT:  { marketCap: "2.1Cr", pe: 14.6, eps: 29.38, bookValue: 310.0, roe: 18.2, w52High: 490.0, w52Low: 280.0, volume: "7.8M", avgVolume: "6.5M", sector: "Analytics" },
  INCON:  { marketCap: "0.96Cr", pe: 8.4, eps: 22.90, bookValue: 140.0, roe: 20.6, w52High: 225.0, w52Low: 120.0, volume: "12.4M", avgVolume: "10.2M", sector: "Analytics" },
  // CELESTE subs
  CELRES: { marketCap: "4.9Cr", pe: 24.6, eps: 40.01, bookValue: 680.0, roe: 16.8, w52High: 1080.0, w52Low: 650.0, volume: "5.5M", avgVolume: "4.7M", sector: "Science & Research" },
  CELENR: { marketCap: "7.7Cr", pe: 29.8, eps: 51.77, bookValue: 1040.0, roe: 17.4, w52High: 1720.0, w52Low: 980.0, volume: "4.6M", avgVolume: "3.9M", sector: "Energy" },
  CELBIO: { marketCap: "10.7Cr", pe: 35.4, eps: 60.69, bookValue: 1480.0, roe: 19.8, w52High: 2380.0, w52Low: 1350.0, volume: "6.2M", avgVolume: "5.3M", sector: "Science & Research" },
};

export const stockDirectory: Record<string, StockInfo> = {};

const perStockEvents: Record<string, StockInfo["events"]> = {
  MACAD: [
    { title: "Q4 Results Announcement", date: "2026-04-24", type: "RESULTS" },
    { title: "Annual General Meeting", date: "2026-04-26", type: "AGM" },
  ],
  MTEK: [
    { title: "Product Launch — LaTeX Editor v3", date: "2026-04-25", type: "EVENT" },
  ],
  ESOFT: [
    { title: "Q4 Results Announcement", date: "2026-04-24", type: "RESULTS" },
    { title: "Open Source Contribution Drive", date: "2026-04-26", type: "EVENT" },
  ],
  ECLOUD: [
    { title: "Interim Dividend — \u20B912/share", date: "2026-04-25", type: "DIVIDEND" },
  ],
  ENAI: [
    { title: "AI Expo Showcase", date: "2026-04-26", type: "EVENT" },
    { title: "Q4 Results Announcement", date: "2026-04-24", type: "RESULTS" },
  ],
  GMAUTO: [
    { title: "Annual General Meeting", date: "2026-04-25", type: "AGM" },
    { title: "Q4 Results Announcement", date: "2026-04-26", type: "RESULTS" },
  ],
  GMRACE: [
    { title: "National Racing Championship", date: "2026-04-25", type: "EVENT" },
  ],
  MSSTD: [
    { title: "Film Festival Premiere", date: "2026-04-24", type: "EVENT" },
    { title: "Q4 Results Announcement", date: "2026-04-26", type: "RESULTS" },
  ],
  ERLEARN: [
    { title: "Q4 Results Announcement", date: "2026-04-25", type: "RESULTS" },
  ],
  INDATA: [
    { title: "Annual Data Summit", date: "2026-04-24", type: "EVENT" },
    { title: "Q4 Results Announcement", date: "2026-04-25", type: "RESULTS" },
    { title: "Final Dividend — \u20B98/share", date: "2026-04-26", type: "DIVIDEND" },
  ],
  CELRES: [
    { title: "Observatory Open Night", date: "2026-04-24", type: "EVENT" },
    { title: "Q4 Results Announcement", date: "2026-04-26", type: "RESULTS" },
  ],
  CELBIO: [
    { title: "Biotech Research Symposium", date: "2026-04-25", type: "EVENT" },
  ],
};

for (const s of allStocksRaw) {
  stockDirectory[s.ticker] = {
    ...s,
    chartData: generateChartData(s.price),
    overview: { open: s.price, dayLow: +(s.price * 0.985).toFixed(2), dayHigh: +(s.price * 1.012).toFixed(2) },
    fundamentals: stockFundamentals[s.ticker],
    events: perStockEvents[s.ticker],
  };
}

// Enriched flat list for screener / stocks page (merges fundamentals + sparkline)
const holdingSparklines: Record<string, number[]> = {};
for (const h of holdings) holdingSparklines[h.ticker] = h.sparkline;
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
    sparkline: holdingSparklines[s.ticker] || watchlistSparklines[s.ticker] || [s.price, s.price, s.price, s.price, s.price],
  };
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
    { id: "CN-1", title: "Enigma AI wins National Hackathon 2026", content: "Enigma AI's team secured first place at the National Collegiate Hackathon held in Bangalore, beating 200+ teams.", timestamp: Date.now() - 86400000 * 2 },
    { id: "CN-2", title: "Enigma Cloud launches new CTF Lab", content: "Enigma Cloud inaugurated a dedicated cybersecurity lab with state-of-the-art infrastructure for CTF competitions.", timestamp: Date.now() - 86400000 * 7 },
    { id: "CN-3", title: "Enigma Software hits 500 open-source PRs", content: "Members contributed over 500 pull requests to major open-source projects during the spring contribution drive.", timestamp: Date.now() - 86400000 * 14 },
  ],
  companyEvents: [
    { id: "CE-1", title: "Annual Hackathon", date: "2026-04-25", type: "EVENT" as const },
    { id: "CE-2", title: "Q1 Results Announcement", date: "2026-05-02", type: "RESULTS" as const },
    { id: "CE-3", title: "Annual General Meeting", date: "2026-05-15", type: "AGM" as const },
  ],
};

// ─── IPO Listings ───────────────────────────────────────
export interface IPO {
  name: string;
  ticker: string;
  priceLow: number;
  priceHigh: number;
  lotPrice: number;
  dateStart: string;
  dateEnd: string;
  status: "LIVE" | "UPCOMING" | "CLOSED";
  lotSize: number;
  maxLots: number;
  gmp: number;
  subscriptionTimes: number;
  retailSubscription: number;
  niiSubscription: number;
  about: string;
  drhpUrl: string;
}

export const ipoList: IPO[] = [
  {
    name: "VORTEX ENERGY",
    ticker: "VORTEX",
    priceLow: 1200,
    priceHigh: 1350,
    lotPrice: 13500,
    dateStart: "Jun 10",
    dateEnd: "Jun 13",
    status: "LIVE",
    lotSize: 10,
    maxLots: 5,
    gmp: 180,
    subscriptionTimes: 3.2,
    retailSubscription: 4.8,
    niiSubscription: 2.1,
    about:
      "Renewable energy club focused on sustainable campus solutions and green technology initiatives. Active in solar panel installations and EV charging infrastructure across campus.",
    drhpUrl: "#",
  },
  {
    name: "AEON DYNAMICS",
    ticker: "AEONDYN",
    priceLow: 850,
    priceHigh: 920,
    lotPrice: 13800,
    dateStart: "Jun 15",
    dateEnd: "Jun 18",
    status: "UPCOMING",
    lotSize: 15,
    maxLots: 7,
    gmp: 0,
    subscriptionTimes: 0,
    retailSubscription: 0,
    niiSubscription: 0,
    about:
      "Robotics and automation club specializing in drone technology and autonomous systems. Winners of the national RoboCup challenge 2025.",
    drhpUrl: "#",
  },
  {
    name: "NEXGEN LABS",
    ticker: "NEXGEN",
    priceLow: 340,
    priceHigh: 380,
    lotPrice: 9500,
    dateStart: "Jun 20",
    dateEnd: "Jun 23",
    status: "UPCOMING",
    lotSize: 25,
    maxLots: 10,
    gmp: 0,
    subscriptionTimes: 0,
    retailSubscription: 0,
    niiSubscription: 0,
    about:
      "Research-driven biotech and chemistry club with published papers in peer-reviewed journals. Three patents pending for novel water purification methods.",
    drhpUrl: "#",
  },
];