import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Micro-tick: every 15 seconds — update all stock prices
crons.interval(
  "price-micro-tick",
  { seconds: 15 },
  internal.priceEngine.applyMicroTick,
);

// Macro-tick: every 5 minutes — LLM sentiment update
crons.interval(
  "sentiment-macro-tick",
  { minutes: 5 },
  internal.priceEngine.applyMacroTick,
);

// News generator: every 5 minutes — LLM news items
// Offset by 2.5 minutes so news and sentiment don't fire simultaneously
crons.interval(
  "news-macro-tick",
  { minutes: 5 },
  internal.news.generateMacroNews,
);

export default crons;
