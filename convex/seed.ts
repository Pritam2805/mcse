import { v } from "convex/values";
import { mutation } from "./_generated/server";

// ─── Price Formula ────────────────────────────────────────────────────────────
// Price = SECTOR_BASE × TIER_MULTIPLIER × quality_factor
// quality_factor = (pq×0.4 + bs×0.3 + cs×0.3) / 100
//
// SECTOR_BASE (₹): Technology 2200 | Finance 1400 | Automotive 1100
//                  Pharmaceutical 1900 | Defense 1700 | Media 750 | Consumer Goods 550
// TIER_MULTIPLIER: FLAGSHIP 1.6 | SECONDARY 1.0 | EMERGING 0.55
// ─────────────────────────────────────────────────────────────────────────────

const SECTOR_BASE: Record<string, number> = {
  Technology: 2200,
  Finance: 1400,
  Automotive: 1100,
  Pharmaceutical: 1900,
  Defense: 1700,
  Media: 750,
  "Consumer Goods": 550,
};
const TIER_MUL = { FLAGSHIP: 1.6, SECONDARY: 1.0, EMERGING: 0.55 };

function computePrice(
  sector: string,
  tier: "FLAGSHIP" | "SECONDARY" | "EMERGING",
  pq: number,
  bs: number,
  cs: number,
): number {
  const base = SECTOR_BASE[sector] ?? 1000;
  const qf = (pq * 0.4 + bs * 0.3 + cs * 0.3) / 100;
  return Math.round((base * TIER_MUL[tier] * qf) / 5) * 5;
}

type StockSeed = {
  ticker: string;
  name: string;
  sector: string;
  tier: "FLAGSHIP" | "SECONDARY" | "EMERGING";
  pq: number; bs: number; cs: number; ip: number;
  revenue: number; expenses: number; cash: number; debt: number;
  assets: number; liabilities: number; rd: number; mks: number;
  employees: number; shares: number; // shares in thousands
};

type HoldingSeed = {
  slug: string; name: string; ticker: string; sector: string;
  about: string; logoLetter: string; stocks: StockSeed[];
};

const HOLDINGS: HoldingSeed[] = [
  {
    slug: "enigma", name: "Enigma Group", ticker: "ENIGMA", sector: "Technology", logoLetter: "E",
    about: "Enigma is the premier computer science and coding club turned tech conglomerate in the AEON universe, operating across software, cloud infrastructure, and artificial intelligence.",
    stocks: [
      { ticker: "ESOFT",  name: "Enigma Software",  sector: "Technology", tier: "FLAGSHIP",  pq: 85, bs: 82, cs: 80, ip: 78, revenue: 450000, expenses: 320000, cash: 80000, debt: 120000, assets: 310000, liabilities: 180000, rd: 50000, mks: 30000, employees: 850, shares: 10000 },
      { ticker: "ECLOUD", name: "Enigma Cloud",     sector: "Technology", tier: "SECONDARY", pq: 78, bs: 74, cs: 76, ip: 72, revenue: 280000, expenses: 210000, cash: 55000, debt: 80000,  assets: 220000, liabilities: 140000, rd: 30000, mks: 20000, employees: 520, shares: 8000 },
      { ticker: "ENAI",   name: "Enigma AI",        sector: "Technology", tier: "EMERGING",  pq: 72, bs: 68, cs: 70, ip: 85, revenue: 120000, expenses: 110000, cash: 30000, debt: 40000,  assets: 120000, liabilities: 70000,  rd: 35000, mks: 10000, employees: 280, shares: 5000 },
    ],
  },
  {
    slug: "erudite", name: "Erudite Group", ticker: "ERUDITE", sector: "Media", logoLetter: "R",
    about: "Erudite is the literary and debate society reimagined as a media and education conglomerate, running a learning platform, publishing house, and digital research division.",
    stocks: [
      { ticker: "ERLEARN", name: "Erudite Learn",  sector: "Media", tier: "FLAGSHIP",  pq: 82, bs: 78, cs: 84, ip: 76, revenue: 180000, expenses: 130000, cash: 35000, debt: 50000, assets: 180000, liabilities: 100000, rd: 20000, mks: 25000, employees: 420, shares: 6000 },
      { ticker: "ERPRESS", name: "Erudite Press",  sector: "Media", tier: "SECONDARY", pq: 75, bs: 72, cs: 77, ip: 65, revenue: 90000,  expenses: 72000,  cash: 18000, debt: 25000, assets: 95000,  liabilities: 55000,  rd: 8000,  mks: 12000, employees: 210, shares: 4000 },
      { ticker: "ERLAB",   name: "Erudite Labs",   sector: "Media", tier: "EMERGING",  pq: 68, bs: 62, cs: 65, ip: 80, revenue: 40000,  expenses: 38000,  cash: 10000, debt: 15000, assets: 55000,  liabilities: 30000,  rd: 12000, mks: 5000,  employees: 110, shares: 3000 },
    ],
  },
  {
    slug: "marc", name: "MARC Group", ticker: "MARC", sector: "Finance", logoLetter: "M",
    about: "MARC (Marketing, Analytics & Research Collective) is AEON's foremost financial analytics holding company, running finance advisory, market research, and management consulting.",
    stocks: [
      { ticker: "MARCF", name: "MARC Finance",     sector: "Finance", tier: "FLAGSHIP",  pq: 80, bs: 77, cs: 78, ip: 70, revenue: 320000, expenses: 240000, cash: 60000, debt: 90000, assets: 280000, liabilities: 160000, rd: 25000, mks: 35000, employees: 620, shares: 7500 },
      { ticker: "MARCM", name: "MARC Markets",     sector: "Finance", tier: "SECONDARY", pq: 73, bs: 70, cs: 72, ip: 63, revenue: 175000, expenses: 140000, cash: 32000, debt: 55000, assets: 160000, liabilities: 95000,  rd: 12000, mks: 20000, employees: 340, shares: 5000 },
      { ticker: "MARCC", name: "MARC Consulting",  sector: "Finance", tier: "EMERGING",  pq: 65, bs: 62, cs: 67, ip: 58, revenue: 80000,  expenses: 68000,  cash: 15000, debt: 28000, assets: 85000,  liabilities: 50000,  rd: 5000,  mks: 10000, employees: 180, shares: 3500 },
    ],
  },
  {
    slug: "ambrosia", name: "Ambrosia Group", ticker: "AMBROSIA", sector: "Consumer Goods", logoLetter: "A",
    about: "Ambrosia is AEON's leading food and lifestyle conglomerate, operating upscale restaurant chains, a food-tech delivery platform, and a luxury dining brand.",
    stocks: [
      { ticker: "AMBR", name: "Ambrosia Restaurants", sector: "Consumer Goods", tier: "FLAGSHIP",  pq: 78, bs: 75, cs: 82, ip: 60, revenue: 140000, expenses: 110000, cash: 22000, debt: 35000, assets: 130000, liabilities: 75000, rd: 8000,  mks: 18000, employees: 380, shares: 5000 },
      { ticker: "AMBF", name: "Ambrosia Fresh",       sector: "Consumer Goods", tier: "SECONDARY", pq: 70, bs: 68, cs: 73, ip: 55, revenue: 70000,  expenses: 60000,  cash: 12000, debt: 20000, assets: 72000,  liabilities: 42000, rd: 4000,  mks: 9000,  employees: 200, shares: 3500 },
      { ticker: "AMBL", name: "Ambrosia Luxe",        sector: "Consumer Goods", tier: "EMERGING",  pq: 62, bs: 65, cs: 60, ip: 50, revenue: 30000,  expenses: 28000,  cash: 7000,  debt: 12000, assets: 38000,  liabilities: 22000, rd: 2000,  mks: 5000,  employees: 90,  shares: 2500 },
    ],
  },
  {
    slug: "roboverse", name: "Roboverse Group", ticker: "ROBOVERSE", sector: "Defense", logoLetter: "R",
    about: "Roboverse designs and manufactures autonomous robotic systems for defense and industrial applications, from combat bots to AI-powered automation platforms.",
    stocks: [
      { ticker: "RBVX", name: "Roboverse Systems",       sector: "Defense",     tier: "FLAGSHIP",  pq: 83, bs: 79, cs: 76, ip: 88, revenue: 380000, expenses: 280000, cash: 72000, debt: 100000, assets: 350000, liabilities: 200000, rd: 65000, mks: 25000, employees: 720, shares: 8000 },
      { ticker: "RBVM", name: "Roboverse Manufacturing", sector: "Defense",     tier: "SECONDARY", pq: 75, bs: 71, cs: 69, ip: 75, revenue: 210000, expenses: 165000, cash: 40000, debt: 65000,  assets: 210000, liabilities: 120000, rd: 35000, mks: 15000, employees: 480, shares: 6000 },
      { ticker: "RBVA", name: "Roboverse AI",            sector: "Technology",  tier: "EMERGING",  pq: 70, bs: 66, cs: 68, ip: 92, revenue: 85000,  expenses: 80000,  cash: 20000, debt: 30000,  assets: 105000, liabilities: 60000,  rd: 28000, mks: 8000,  employees: 210, shares: 4000 },
    ],
  },
  {
    slug: "cognitia", name: "Cognitia Group", ticker: "COGNITIA", sector: "Technology", logoLetter: "C",
    about: "Cognitia is a cognitive technology conglomerate specialising in AI research, behavioural analytics, and next-generation intelligent products for enterprise and government.",
    stocks: [
      { ticker: "CGNR", name: "Cognitia Research",   sector: "Technology", tier: "FLAGSHIP",  pq: 81, bs: 78, cs: 75, ip: 90, revenue: 310000, expenses: 240000, cash: 65000, debt: 95000, assets: 310000, liabilities: 175000, rd: 70000, mks: 20000, employees: 680, shares: 7500 },
      { ticker: "CGNA", name: "Cognitia Analytics",  sector: "Technology", tier: "SECONDARY", pq: 74, bs: 72, cs: 71, ip: 78, revenue: 180000, expenses: 145000, cash: 38000, debt: 58000, assets: 190000, liabilities: 110000, rd: 38000, mks: 18000, employees: 400, shares: 5500 },
      { ticker: "CGNX", name: "Cognitia X",          sector: "Technology", tier: "EMERGING",  pq: 67, bs: 64, cs: 65, ip: 85, revenue: 60000,  expenses: 58000,  cash: 18000, debt: 22000, assets: 80000,  liabilities: 45000,  rd: 20000, mks: 6000,  employees: 160, shares: 3000 },
    ],
  },
  {
    slug: "gas-monkeys", name: "Gas Monkeys Group", ticker: "GASMONKEYS", sector: "Automotive", logoLetter: "G",
    about: "Gas Monkeys is AEON's iconic automotive conglomerate, running a formula motorsport team, a parts manufacturing plant, and a vehicle servicing network.",
    stocks: [
      { ticker: "GMRACE", name: "GM Racing",      sector: "Automotive", tier: "FLAGSHIP",  pq: 79, bs: 82, cs: 78, ip: 70, revenue: 250000, expenses: 195000, cash: 45000, debt: 70000, assets: 240000, liabilities: 140000, rd: 30000, mks: 35000, employees: 550, shares: 6500 },
      { ticker: "GMAUTO", name: "GM Automotive",  sector: "Automotive", tier: "SECONDARY", pq: 73, bs: 70, cs: 72, ip: 60, revenue: 150000, expenses: 122000, cash: 28000, debt: 45000, assets: 155000, liabilities: 90000,  rd: 15000, mks: 18000, employees: 380, shares: 5000 },
      { ticker: "GMSERV", name: "GM Services",    sector: "Automotive", tier: "EMERGING",  pq: 65, bs: 63, cs: 68, ip: 50, revenue: 65000,  expenses: 57000,  cash: 12000, debt: 20000, assets: 70000,  liabilities: 40000,  rd: 5000,  mks: 8000,  employees: 200, shares: 3500 },
    ],
  },
  {
    slug: "lincoln-labs", name: "Lincoln Labs Group", ticker: "LINCOLNLABS", sector: "Pharmaceutical", logoLetter: "L",
    about: "Lincoln Labs is AEON's premier research conglomerate spanning medical devices, pharmaceutical R&D, and biotech innovation, bridging academic research and commercial application.",
    stocks: [
      { ticker: "LLMED", name: "Lincoln Medical",   sector: "Pharmaceutical", tier: "FLAGSHIP",  pq: 84, bs: 80, cs: 83, ip: 82, revenue: 420000, expenses: 310000, cash: 78000, debt: 110000, assets: 420000, liabilities: 230000, rd: 80000, mks: 28000, employees: 780, shares: 9000 },
      { ticker: "LLRES", name: "Lincoln Research",  sector: "Pharmaceutical", tier: "SECONDARY", pq: 77, bs: 74, cs: 76, ip: 88, revenue: 220000, expenses: 175000, cash: 42000, debt: 65000,  assets: 240000, liabilities: 135000, rd: 55000, mks: 12000, employees: 450, shares: 6000 },
      { ticker: "LLBIO", name: "Lincoln Bio",       sector: "Pharmaceutical", tier: "EMERGING",  pq: 69, bs: 66, cs: 70, ip: 86, revenue: 85000,  expenses: 80000,  cash: 22000, debt: 30000,  assets: 110000, liabilities: 60000,  rd: 30000, mks: 7000,  employees: 200, shares: 3500 },
    ],
  },
  {
    slug: "aero", name: "Aero Group", ticker: "AERO", sector: "Defense", logoLetter: "A",
    about: "Aero is a defense-tech group building autonomous drone systems, advanced propulsion units, and integrated avionics for defense and civilian aerospace applications.",
    stocks: [
      { ticker: "AEROD", name: "Aero Drones",      sector: "Defense", tier: "FLAGSHIP",  pq: 82, bs: 78, cs: 74, ip: 86, revenue: 360000, expenses: 270000, cash: 68000, debt: 98000, assets: 360000, liabilities: 205000, rd: 72000, mks: 22000, employees: 700, shares: 8000 },
      { ticker: "AEROP", name: "Aero Propulsion",  sector: "Defense", tier: "SECONDARY", pq: 75, bs: 72, cs: 70, ip: 78, revenue: 195000, expenses: 158000, cash: 38000, debt: 62000, assets: 210000, liabilities: 120000, rd: 40000, mks: 14000, employees: 420, shares: 5500 },
      { ticker: "AEROS", name: "Aero Systems",     sector: "Defense", tier: "EMERGING",  pq: 67, bs: 64, cs: 65, ip: 74, revenue: 75000,  expenses: 70000,  cash: 18000, debt: 26000, assets: 90000,  liabilities: 52000,  rd: 18000, mks: 6000,  employees: 190, shares: 3500 },
    ],
  },
  {
    slug: "apex-pmi", name: "Apex PMI Group", ticker: "APEXPMI", sector: "Finance", logoLetter: "A",
    about: "Apex PMI is AEON's flagship project management and financial advisory conglomerate, offering infrastructure finance, investment management, and executive consulting.",
    stocks: [
      { ticker: "APXF", name: "Apex Finance",         sector: "Finance", tier: "FLAGSHIP",  pq: 77, bs: 74, cs: 76, ip: 68, revenue: 290000, expenses: 225000, cash: 55000, debt: 85000, assets: 285000, liabilities: 165000, rd: 18000, mks: 32000, employees: 580, shares: 7000 },
      { ticker: "APXI", name: "Apex Infrastructure",  sector: "Finance", tier: "SECONDARY", pq: 71, bs: 68, cs: 70, ip: 60, revenue: 155000, expenses: 128000, cash: 30000, debt: 50000, assets: 160000, liabilities: 92000,  rd: 10000, mks: 18000, employees: 320, shares: 5000 },
      { ticker: "APXM", name: "Apex Management",      sector: "Finance", tier: "EMERGING",  pq: 64, bs: 61, cs: 65, ip: 55, revenue: 68000,  expenses: 60000,  cash: 13000, debt: 22000, assets: 78000,  liabilities: 45000,  rd: 5000,  mks: 9000,  employees: 165, shares: 3000 },
    ],
  },
  {
    slug: "acm", name: "ACM Group", ticker: "ACM", sector: "Technology", logoLetter: "A",
    about: "ACM Group is a technology conglomerate born from the computing society, running applied research, enterprise software, and a data science platform across AEON's institutions.",
    stocks: [
      { ticker: "ACMR", name: "ACM Research",  sector: "Technology", tier: "FLAGSHIP",  pq: 80, bs: 76, cs: 74, ip: 88, revenue: 290000, expenses: 225000, cash: 60000, debt: 88000, assets: 295000, liabilities: 170000, rd: 68000, mks: 18000, employees: 640, shares: 7500 },
      { ticker: "ACMS", name: "ACM Software",  sector: "Technology", tier: "SECONDARY", pq: 73, bs: 70, cs: 71, ip: 76, revenue: 165000, expenses: 135000, cash: 35000, debt: 52000, assets: 175000, liabilities: 100000, rd: 35000, mks: 16000, employees: 380, shares: 5000 },
      { ticker: "ACMD", name: "ACM Data",      sector: "Technology", tier: "EMERGING",  pq: 67, bs: 64, cs: 66, ip: 80, revenue: 65000,  expenses: 61000,  cash: 17000, debt: 22000, assets: 85000,  liabilities: 48000,  rd: 20000, mks: 7000,  employees: 175, shares: 3000 },
    ],
  },
  {
    slug: "adventure", name: "Adventure Group", ticker: "ADVENTURE", sector: "Consumer Goods", logoLetter: "A",
    about: "Adventure Group is AEON's premier outdoor and experiential lifestyle company, operating adventure tourism circuits, a sports equipment brand, and immersive experience parks.",
    stocks: [
      { ticker: "ADVT", name: "Adventure Tourism",    sector: "Consumer Goods", tier: "FLAGSHIP",  pq: 76, bs: 72, cs: 80, ip: 62, revenue: 125000, expenses: 98000,  cash: 20000, debt: 32000, assets: 120000, liabilities: 68000, rd: 7000,  mks: 16000, employees: 340, shares: 4500 },
      { ticker: "ADVS", name: "Adventure Sports",     sector: "Consumer Goods", tier: "SECONDARY", pq: 70, bs: 68, cs: 73, ip: 56, revenue: 62000,  expenses: 54000,  cash: 11000, debt: 18000, assets: 65000,  liabilities: 38000, rd: 4000,  mks: 8000,  employees: 175, shares: 3500 },
      { ticker: "ADVX", name: "Adventure Experience", sector: "Consumer Goods", tier: "EMERGING",  pq: 62, bs: 60, cs: 65, ip: 52, revenue: 28000,  expenses: 26000,  cash: 6000,  debt: 11000, assets: 34000,  liabilities: 20000, rd: 2000,  mks: 4000,  employees: 85,  shares: 2500 },
    ],
  },
  {
    slug: "auv", name: "AUV Group", ticker: "AUV", sector: "Defense", logoLetter: "U",
    about: "AUV Group develops autonomous underwater vehicles for defense surveillance, deep-sea exploration, and marine infrastructure monitoring.",
    stocks: [
      { ticker: "AUVS", name: "AUV Systems",   sector: "Defense", tier: "FLAGSHIP",  pq: 78, bs: 74, cs: 72, ip: 84, revenue: 310000, expenses: 245000, cash: 58000, debt: 88000, assets: 310000, liabilities: 180000, rd: 62000, mks: 18000, employees: 620, shares: 7000 },
      { ticker: "AUVR", name: "AUV Research",  sector: "Defense", tier: "SECONDARY", pq: 71, bs: 68, cs: 67, ip: 88, revenue: 165000, expenses: 138000, cash: 32000, debt: 52000, assets: 175000, liabilities: 100000, rd: 45000, mks: 10000, employees: 360, shares: 5000 },
      { ticker: "AUVM", name: "AUV Marine",    sector: "Defense", tier: "EMERGING",  pq: 63, bs: 60, cs: 62, ip: 76, revenue: 62000,  expenses: 59000,  cash: 15000, debt: 22000, assets: 78000,  liabilities: 45000,  rd: 20000, mks: 5000,  employees: 160, shares: 3000 },
    ],
  },
  {
    slug: "media", name: "Media Group", ticker: "MEDIA", sector: "Media", logoLetter: "M",
    about: "Media Group is AEON's broadcast and content powerhouse, running a film and TV production studio, a digital content network, and a multi-channel broadcast platform.",
    stocks: [
      { ticker: "MEDP", name: "Media Productions", sector: "Media", tier: "FLAGSHIP",  pq: 80, bs: 78, cs: 77, ip: 72, revenue: 210000, expenses: 165000, cash: 38000, debt: 58000, assets: 210000, liabilities: 120000, rd: 18000, mks: 30000, employees: 500, shares: 6500 },
      { ticker: "MEDD", name: "Media Digital",     sector: "Media", tier: "SECONDARY", pq: 73, bs: 71, cs: 74, ip: 68, revenue: 110000, expenses: 90000,  cash: 20000, debt: 32000, assets: 115000, liabilities: 65000,  rd: 10000, mks: 18000, employees: 270, shares: 4500 },
      { ticker: "MEDB", name: "Media Broadcast",   sector: "Media", tier: "EMERGING",  pq: 65, bs: 63, cs: 67, ip: 58, revenue: 48000,  expenses: 43000,  cash: 10000, debt: 16000, assets: 55000,  liabilities: 32000,  rd: 5000,  mks: 9000,  employees: 130, shares: 3000 },
    ],
  },
  {
    slug: "aeiforia", name: "Aeiforia Group", ticker: "AEIFORIA", sector: "Consumer Goods", logoLetter: "Æ",
    about: "Aeiforia curates fashion, arts, and premium lifestyle for AEON's discerning consumers, operating a fashion house, an arts collective, and a luxury lifestyle brand.",
    stocks: [
      { ticker: "AEIF", name: "Aeiforia Fashion",   sector: "Consumer Goods", tier: "FLAGSHIP",  pq: 75, bs: 78, cs: 73, ip: 65, revenue: 115000, expenses: 90000,  cash: 18000, debt: 28000, assets: 112000, liabilities: 62000, rd: 8000,  mks: 20000, employees: 310, shares: 4500 },
      { ticker: "AEIA", name: "Aeiforia Arts",      sector: "Media",          tier: "SECONDARY", pq: 68, bs: 72, cs: 70, ip: 60, revenue: 58000,  expenses: 50000,  cash: 10000, debt: 18000, assets: 65000,  liabilities: 37000, rd: 5000,  mks: 12000, employees: 155, shares: 3500 },
      { ticker: "AEIL", name: "Aeiforia Lifestyle", sector: "Consumer Goods", tier: "EMERGING",  pq: 62, bs: 65, cs: 60, ip: 55, revenue: 26000,  expenses: 24000,  cash: 6000,  debt: 10000, assets: 32000,  liabilities: 18000, rd: 2000,  mks: 5000,  employees: 80,  shares: 2500 },
    ],
  },
  {
    slug: "qubit", name: "Qubit Group", ticker: "QUBIT", sector: "Technology", logoLetter: "Q",
    about: "Qubit Group is AEON's quantum computing pioneer, running advanced quantum research, quantum software development, and consulting services for enterprises entering the quantum era.",
    stocks: [
      { ticker: "QBTR", name: "Qubit Research",    sector: "Technology", tier: "FLAGSHIP",  pq: 88, bs: 82, cs: 78, ip: 95, revenue: 480000, expenses: 360000, cash: 90000, debt: 130000, assets: 490000, liabilities: 270000, rd: 110000, mks: 22000, employees: 880, shares: 10000 },
      { ticker: "QBTS", name: "Qubit Software",    sector: "Technology", tier: "SECONDARY", pq: 80, bs: 76, cs: 75, ip: 88, revenue: 255000, expenses: 200000, cash: 50000, debt: 78000,  assets: 270000, liabilities: 155000, rd: 60000,  mks: 18000, employees: 520, shares: 7000 },
      { ticker: "QBTC", name: "Qubit Consulting",  sector: "Technology", tier: "EMERGING",  pq: 72, bs: 68, cs: 70, ip: 78, revenue: 100000, expenses: 92000,  cash: 25000, debt: 33000,  assets: 115000, liabilities: 65000,  rd: 22000,  mks: 10000, employees: 240, shares: 4000 },
    ],
  },
  {
    slug: "mastershot", name: "MasterShot Group", ticker: "MASTERSHOT", sector: "Media", logoLetter: "S",
    about: "MasterShot Group is the media and entertainment society turned AEON's top entertainment company, producing films, digital content, and operating a broad media distribution network.",
    stocks: [
      { ticker: "MSSTD",   name: "MasterShot Studios", sector: "Media", tier: "FLAGSHIP",  pq: 84, bs: 82, cs: 80, ip: 74, revenue: 240000, expenses: 185000, cash: 42000, debt: 64000, assets: 240000, liabilities: 138000, rd: 20000, mks: 38000, employees: 560, shares: 7000 },
      { ticker: "MSDIGI",  name: "MasterShot Digital", sector: "Media", tier: "SECONDARY", pq: 77, bs: 75, cs: 76, ip: 70, revenue: 125000, expenses: 102000, cash: 22000, debt: 36000, assets: 130000, liabilities: 75000,  rd: 12000, mks: 22000, employees: 290, shares: 4500 },
      { ticker: "MSMEDIA", name: "MasterShot Media",   sector: "Media", tier: "EMERGING",  pq: 70, bs: 68, cs: 70, ip: 62, revenue: 55000,  expenses: 49000,  cash: 11000, debt: 18000, assets: 62000,  liabilities: 36000,  rd: 6000,  mks: 11000, employees: 145, shares: 3500 },
    ],
  },
  {
    slug: "eic", name: "EIC Group", ticker: "EIC", sector: "Finance", logoLetter: "E",
    about: "EIC (Entrepreneurship & Innovation Cell) Group is AEON's startup ecosystem conglomerate, running early-stage venture finance, growth investment, and innovation management.",
    stocks: [
      { ticker: "EICF", name: "EIC Finance",      sector: "Finance", tier: "FLAGSHIP",  pq: 76, bs: 73, cs: 75, ip: 72, revenue: 260000, expenses: 205000, cash: 50000, debt: 78000, assets: 265000, liabilities: 152000, rd: 20000, mks: 28000, employees: 520, shares: 6500 },
      { ticker: "EICI", name: "EIC Investments",  sector: "Finance", tier: "SECONDARY", pq: 69, bs: 66, cs: 68, ip: 65, revenue: 138000, expenses: 115000, cash: 26000, debt: 42000, assets: 145000, liabilities: 83000,  rd: 10000, mks: 15000, employees: 280, shares: 4500 },
      { ticker: "EICM", name: "EIC Management",   sector: "Finance", tier: "EMERGING",  pq: 61, bs: 58, cs: 62, ip: 60, revenue: 55000,  expenses: 50000,  cash: 10000, debt: 18000, assets: 62000,  liabilities: 36000,  rd: 5000,  mks: 7000,  employees: 140, shares: 3000 },
    ],
  },
  {
    slug: "synolo", name: "Synolo Group", ticker: "SYNOLO", sector: "Media", logoLetter: "S",
    about: "Synolo (Greek: 'all together') is AEON's cultural production and community entertainment group, running a live-events studio, a productions label, and a cross-sector innovation arm.",
    stocks: [
      { ticker: "SYNS", name: "Synolo Studios",     sector: "Media",      tier: "FLAGSHIP",  pq: 75, bs: 73, cs: 77, ip: 68, revenue: 155000, expenses: 125000, cash: 28000, debt: 42000, assets: 155000, liabilities: 88000, rd: 12000, mks: 22000, employees: 365, shares: 5500 },
      { ticker: "SYNP", name: "Synolo Productions", sector: "Media",      tier: "SECONDARY", pq: 68, bs: 66, cs: 70, ip: 62, revenue: 78000,  expenses: 67000,  cash: 14000, debt: 22000, assets: 82000,  liabilities: 46000, rd: 8000,  mks: 12000, employees: 195, shares: 4000 },
      { ticker: "SYNI", name: "Synolo Innovation",  sector: "Technology", tier: "EMERGING",  pq: 62, bs: 60, cs: 63, ip: 74, revenue: 32000,  expenses: 30000,  cash: 8000,  debt: 12000, assets: 42000,  liabilities: 24000, rd: 10000, mks: 4000,  employees: 95,  shares: 2500 },
    ],
  },
];

export const init = mutation({
  args: {},
  returns: v.object({ holdings: v.number(), stocks: v.number() }),
  handler: async (ctx) => {
    const existing = await ctx.db.query("holdingCompanies").first();
    if (existing) return { holdings: 0, stocks: 0 };

    let holdingsCreated = 0;
    let stocksCreated = 0;
    const now = Date.now();

    for (const h of HOLDINGS) {
      const holdingId = await ctx.db.insert("holdingCompanies", {
        slug: h.slug,
        name: h.name,
        ticker: h.ticker,
        sector: h.sector,
        about: h.about,
        logoLetter: h.logoLetter,
      });
      holdingsCreated++;

      for (const s of h.stocks) {
        const price = computePrice(s.sector, s.tier, s.pq, s.bs, s.cs);
        const sharesOut = s.shares * 1000;
        const floatShares = Math.round(sharesOut * 0.65);

        await ctx.db.insert("stocks", {
          holdingId,
          ticker: s.ticker,
          name: s.name,
          sector: s.sector,
          tier: s.tier,
          currentPrice: price,
          openPrice: price,
          dayHigh: price,
          dayLow: price,
          changeDay: 0,
          changePctDay: 0,
          volumeDay: 0,
          sharesOutstanding: sharesOut,
          floatShares,
          revenue: s.revenue * 1000,
          expenses: s.expenses * 1000,
          profit: (s.revenue - s.expenses) * 1000,
          rdInvestment: s.rd * 1000,
          marketingSpend: s.mks * 1000,
          cash: s.cash * 1000,
          debt: s.debt * 1000,
          assets: s.assets * 1000,
          liabilities: s.liabilities * 1000,
          productQuality: s.pq,
          customerSatisfaction: s.cs,
          innovationPipeline: s.ip,
          brandStrength: s.bs,
          employeeCount: s.employees,
          marketCap: price * sharesOut,
          netSentimentFactor: 0,
          macroOpenPrice: price,
          isListed: true,
          createdAt: now,
        });
        stocksCreated++;
      }
    }

    // Seed market state
    await ctx.db.insert("marketState", {
      isOpen: false,
      currentMicroTick: 0,
      currentMacroTick: 0,
      dayNumber: 1,
      lastMicroTickAt: now,
      lastMacroTickAt: now,
    });

    return { holdings: holdingsCreated, stocks: stocksCreated };
  },
});
