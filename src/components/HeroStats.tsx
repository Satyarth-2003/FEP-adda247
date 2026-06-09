"use client";
import { motion } from "framer-motion";
import { ScoreRing } from "./ScoreRing";
import { TrendingUp, Video, BadgeCheck } from "lucide-react";

interface HeroStatsProps {
  name: string;
  avgScore: number;
  totalVideos: number;
  pctRated: number;
  trendDelta?: number;
}

export function HeroStats({
  name,
  avgScore,
  totalVideos,
  pctRated,
  trendDelta = 0,
}: HeroStatsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass-strong rounded-2xl p-6 md:p-8"
    >
      <div className="flex flex-col md:flex-row md:items-center gap-8">
        <div className="flex items-center gap-6">
          <ScoreRing score={avgScore} size={120} stroke={8} label="GRADI AVG" />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-fg-muted">
              Welcome
            </p>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight">
              {name}
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
              Here&apos;s how your content is performing.
            </p>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-3">
          <Stat
            icon={<Video className="h-3.5 w-3.5" />}
            label="Videos"
            value={totalVideos.toString()}
            sub="uploaded"
          />
          <Stat
            icon={<BadgeCheck className="h-3.5 w-3.5" />}
            label="Rated"
            value={`${pctRated}%`}
            sub="by manager"
          />
          <Stat
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Trend"
            value={trendDelta >= 0 ? `+${trendDelta.toFixed(1)}` : trendDelta.toFixed(1)}
            sub="vs last week"
            tone={trendDelta >= 0 ? "emerald" : "rose"}
          />
        </div>
      </div>
    </motion.div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: "emerald" | "rose";
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl border border-border bg-bg-elev/40 p-4"
    >
      <div className="flex items-center gap-1.5 text-fg-muted">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div
        className="mt-2 text-mono text-2xl font-semibold tracking-tight"
        style={{
          color:
            tone === "emerald"
              ? "var(--emerald)"
              : tone === "rose"
                ? "var(--rose)"
                : "var(--fg)",
        }}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-fg-dim">{sub}</div>
    </motion.div>
  );
}
