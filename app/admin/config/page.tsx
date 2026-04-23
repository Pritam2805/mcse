"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Settings, Save, RotateCcw, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { getSessionConfig, updateSessionConfig, type SessionConfig } from "@/lib/api";
import { Skeleton } from "@/components/Skeleton";

type NumericConfigKey =
  | "ticksPerDay"
  | "dayDurationSeconds"
  | "premarketDurationSeconds"
  | "allotmentPostedDurationSeconds"
  | "macroTickSeconds"
  | "microTickSeconds"
  | "circuitBreakerPctMicro"
  | "circuitBreakerPctMacro";

const CONFIG_FIELDS: {
  key: NumericConfigKey;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}[] = [
  {
    key: "ticksPerDay",
    label: "Expected Ticks Per Day (informational)",
    description: "Target macro ticks per trading day. Wall-clock drives day-end; this is informational only.",
    min: 6,
    max: 60,
    step: 1,
    unit: "ticks",
  },
  {
    key: "dayDurationSeconds",
    label: "Trading Day Duration",
    description: "Wall-clock length of DAY_1 and DAY_2 (default 27000 = 7.5 h per spec).",
    min: 3600,
    max: 43200,
    step: 900,
    unit: "seconds",
  },
  {
    key: "premarketDurationSeconds",
    label: "PRE_MARKET (IPO Open) Duration",
    description: "Default 81000 (22.5 h) — spans 23 Apr 18:30 → 24 Apr 17:00 IST.",
    min: 3600,
    max: 129600,
    step: 900,
    unit: "seconds",
  },
  {
    key: "allotmentPostedDurationSeconds",
    label: "Allotment-Posted Read-Only Duration",
    description: "Default 61200 (17 h) — 24 Apr 17:00 → 25 Apr 10:00 IST. Site is read-only during this phase.",
    min: 3600,
    max: 129600,
    step: 900,
    unit: "seconds",
  },
  {
    key: "macroTickSeconds",
    label: "Macro Tick Target Duration",
    description: "Target duration of each macro tick in seconds (pipeline-driven; actual varies).",
    min: 60,
    max: 3600,
    step: 60,
    unit: "seconds",
  },
  {
    key: "microTickSeconds",
    label: "Micro Tick Duration",
    description: "Duration of each micro tick in seconds. Controls price update frequency.",
    min: 1,
    max: 30,
    step: 1,
    unit: "seconds",
  },
  {
    key: "circuitBreakerPctMicro",
    label: "Circuit Breaker (Micro)",
    description: "Maximum price change % allowed per micro tick before circuit breaker triggers.",
    min: 1,
    max: 10,
    step: 0.5,
    unit: "%",
  },
  {
    key: "circuitBreakerPctMacro",
    label: "Circuit Breaker (Macro)",
    description: "Maximum cumulative price change % allowed per macro tick.",
    min: 5,
    max: 25,
    step: 1,
    unit: "%",
  },
];

export default function SessionConfigPage() {
  const { isLoggedIn, role } = useAuth();
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<SessionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      const res = await getSessionConfig();
      if (res.data) {
        setConfig(res.data);
        setOriginalConfig(res.data);
      }
      setLoading(false);
    }
    fetchConfig();
  }, []);

  const hasChanges = config && originalConfig && JSON.stringify(config) !== JSON.stringify(originalConfig);

  async function handleSave() {
    if (!config || !hasChanges) return;
    setSaving(true);
    setSaveMsg(null);

    const res = await updateSessionConfig(config);
    if (res.error) {
      setSaveMsg({ ok: false, text: `Failed to save: ${res.error}` });
    } else {
      setSaveMsg({ ok: true, text: "Configuration saved successfully" });
      setOriginalConfig(config);
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(null), 3000);
  }

  function handleReset() {
    if (originalConfig) {
      setConfig(originalConfig);
    }
  }

  function updateField(key: NumericConfigKey, value: number) {
    if (config) {
      setConfig({ ...config, [key]: value });
    }
  }

  function updatePhaseScheduleJson(value: string) {
    if (config) {
      setConfig({ ...config, phaseScheduleJson: value });
    }
  }

  const phaseScheduleIsValidJson = (() => {
    if (!config) return true;
    try {
      JSON.parse(config.phaseScheduleJson);
      return true;
    } catch {
      return false;
    }
  })();

  // Access control
  if (!isLoggedIn || role !== "admin") {
    return (
      <div className="pb-24 md:pb-12 py-6 md:py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <AlertTriangle size={32} className="text-white/20 mb-4" />
          <p className="font-[var(--font-anton)] text-lg tracking-[0.1em] mb-2">ACCESS DENIED</p>
          <p className="text-[11px] text-white/40 mb-6">Only total admins can access session configuration.</p>
          <Link
            href="/admin"
            className="px-6 py-3 text-[10px] tracking-[0.15em] bg-white text-black font-semibold hover:bg-white/90 transition-colors"
          >
            BACK TO ADMIN
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pb-24 md:pb-12 py-6 md:py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-8"
      >
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="w-11 h-11 border border-white/20 flex items-center justify-center hover:border-white transition-colors"
          >
            <ArrowLeft size={15} />
          </Link>
          <div className="flex items-center gap-3">
            <Settings size={18} className="text-white/40" />
            <div>
              <h1 className="font-[var(--font-anton)] text-lg md:text-xl tracking-[0.1em] uppercase">
                SESSION CONFIG
              </h1>
              <p className="text-[10px] tracking-[0.15em] text-white/30 mt-0.5">
                SIMULATION PARAMETERS
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-[10px] tracking-[0.1em] border border-white/20 text-white/50 hover:text-white hover:border-white/40 transition-colors"
            >
              <RotateCcw size={12} />
              RESET
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving || !phaseScheduleIsValidJson}
            className={`flex items-center gap-2 px-4 py-2 text-[10px] tracking-[0.1em] font-semibold transition-all ${
              hasChanges && !saving && phaseScheduleIsValidJson
                ? "bg-white text-black hover:bg-white/90"
                : "bg-white/10 text-white/30 cursor-not-allowed"
            }`}
          >
            <Save size={12} />
            {saving ? "SAVING..." : "SAVE CHANGES"}
          </button>
        </div>
      </motion.div>

      {/* Save message */}
      {saveMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 px-4 py-3 border text-[11px] tracking-[0.1em] ${
            saveMsg.ok
              ? "bg-up/10 border-up/30 text-up"
              : "bg-down/10 border-down/30 text-down"
          }`}
        >
          {saveMsg.text}
        </motion.div>
      )}

      {/* Config fields */}
      {loading ? (
        <div className="space-y-4">
          {CONFIG_FIELDS.map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : config ? (
        <div className="space-y-4">
          {CONFIG_FIELDS.map((field, idx) => (
            <motion.div
              key={field.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="border border-white/10 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[12px] font-medium text-white/80">{field.label}</p>
                  <p className="text-[10px] text-white/30 mt-1 max-w-md">{field.description}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="font-[var(--font-anton)] text-xl">
                    {config[field.key]}
                    <span className="text-[10px] text-white/30 ml-1">{field.unit}</span>
                  </p>
                  {originalConfig && config[field.key] !== originalConfig[field.key] && (
                    <p className="text-[9px] text-amber-400 mt-0.5">
                      Changed from {originalConfig[field.key]}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-[9px] text-white/20 w-8">{field.min}</span>
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={config[field.key] as number}
                  onChange={(e) => updateField(field.key, parseFloat(e.target.value))}
                  className="flex-1 h-1.5 bg-white/10 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                />
                <span className="text-[9px] text-white/20 w-8 text-right">{field.max}</span>
              </div>
            </motion.div>
          ))}

          {/* Phase Schedule JSON editor */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: CONFIG_FIELDS.length * 0.05 }}
            className="border border-white/10 p-5"
          >
            <div className="mb-3">
              <p className="text-[12px] font-medium text-white/80">Phase Schedule (IST timestamps)</p>
              <p className="text-[10px] text-white/30 mt-1 max-w-md">
                Wall-clock boundaries for PRE_MARKET, ALLOTMENT_POSTED, DAY_1, DAY_END_1, DAY_2, EVENT_END.
                Edit as raw JSON — the engine re-reads on next macro tick.
              </p>
            </div>
            <textarea
              value={config.phaseScheduleJson}
              onChange={(e) => updatePhaseScheduleJson(e.target.value)}
              rows={10}
              className={`w-full bg-black/40 text-[11px] font-mono p-3 border ${
                phaseScheduleIsValidJson ? "border-white/10" : "border-down"
              } text-white/80 focus:outline-none focus:border-white/30`}
            />
            {!phaseScheduleIsValidJson && (
              <p className="text-[10px] text-down mt-1">Invalid JSON — save is disabled</p>
            )}
          </motion.div>

          {/* Warning */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: CONFIG_FIELDS.length * 0.05 }}
            className="border border-amber-400/20 bg-amber-400/5 p-4 flex items-start gap-3"
          >
            <AlertTriangle size={16} className="text-amber-400/70 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] text-amber-400/80 font-medium">Configuration Warning</p>
              <p className="text-[10px] text-white/40 mt-1">
                Changes to session configuration take effect at the start of the next macro tick.
                Modifying these values during an active trading session may cause unexpected behavior.
              </p>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-[11px] text-white/30">Failed to load configuration</p>
        </div>
      )}
    </div>
  );
}
